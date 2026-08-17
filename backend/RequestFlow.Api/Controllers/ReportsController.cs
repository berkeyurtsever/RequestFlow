using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Reports;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ManagementOnly")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IReportDataService _reportDataService;
    private readonly IReportPdfService _pdfService;
    private readonly IReportEmailService _reportEmailService;
    private readonly IAuditLogService _auditLog;

    public ReportsController(
        AppDbContext context,
        IReportDataService reportDataService,
        IReportPdfService pdfService,
        IReportEmailService reportEmailService,
        IAuditLogService auditLog
    )
    {
        _context = context;
        _reportDataService = reportDataService;
        _pdfService = pdfService;
        _reportEmailService = reportEmailService;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<ActionResult<ReportDto>> GetReports(
        [FromQuery] string? period,
        CancellationToken cancellationToken
    )
    {
        var report = await _reportDataService.GetAsync(
            period,
            cancellationToken
        );

        return Ok(report);
    }

    [HttpGet("pdf")]
    public async Task<IActionResult> DownloadPdf(
        [FromQuery] string? period,
        CancellationToken cancellationToken
    )
    {
        var range = ReportPeriodResolver.Resolve(period);
        var content = await _pdfService.GenerateAsync(
            range.Key,
            cancellationToken
        );

        return File(
            content,
            "application/pdf",
            $"requestflow-{range.Key}-report-{DateTime.UtcNow:yyyy-MM-dd}.pdf"
        );
    }

    [HttpGet("schedule")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ReportScheduleDto>> GetSchedule(
        CancellationToken cancellationToken
    )
    {
        var schedule = await GetOrCreateScheduleAsync(
            cancellationToken
        );

        return Ok(ToDto(schedule));
    }

    [HttpPut("schedule")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ReportScheduleDto>> UpdateSchedule(
        [FromBody] UpdateReportScheduleDto request,
        CancellationToken cancellationToken
    )
    {
        var frequency = ReportScheduleRules.NormalizeFrequency(
            request.Frequency
        );

        if (frequency == null)
        {
            return BadRequest(new
            {
                message = "Report frequency must be Weekly or Monthly."
            });
        }

        var recipients = ReportScheduleRules.ParseRecipients(
            request.Recipients
        );
        var validationError = ValidateRecipients(
            recipients,
            request.Enabled
        );

        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

        var schedule = await GetOrCreateScheduleAsync(
            cancellationToken
        );
        schedule.Enabled = request.Enabled;
        schedule.Frequency = frequency;
        schedule.Recipients = string.Join("; ", recipients);
        schedule.NextRunAtUtc = request.Enabled
            ? ReportScheduleRules.CalculateNextRunUtc(frequency)
            : null;
        schedule.UpdatedAtUtc = DateTime.UtcNow;

        _auditLog.Add(
            User,
            "reports.schedule.updated",
            "ReportSchedule",
            schedule.Id.ToString(),
            request.Enabled
                ? $"{frequency} report emails were enabled for {recipients.Count} recipient(s)."
                : "Automatic report emails were disabled."
        );

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(schedule));
    }

    [HttpPost("schedule/send-now")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ReportScheduleDto>> SendNow(
        CancellationToken cancellationToken
    )
    {
        var schedule = await GetOrCreateScheduleAsync(
            cancellationToken
        );
        var recipients = ReportScheduleRules.ParseRecipients(
            schedule.Recipients
        );
        var validationError = ValidateRecipients(
            recipients,
            requireRecipient: true
        );

        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

        var result = await _reportEmailService.SendAsync(
            schedule,
            cancellationToken
        );

        schedule.LastDeliveryStatus = result.Status;
        schedule.LastError = result.Error;
        schedule.UpdatedAtUtc = DateTime.UtcNow;

        if (!result.Sent)
        {
            await _context.SaveChangesAsync(cancellationToken);
            return BadRequest(new
            {
                message = result.Error ?? result.Status,
                schedule = ToDto(schedule)
            });
        }

        schedule.LastSentAtUtc = DateTime.UtcNow;

        _auditLog.Add(
            User,
            "reports.email.sent",
            "ReportSchedule",
            schedule.Id.ToString(),
            $"A {schedule.Frequency.ToLowerInvariant()} PDF report was sent to {recipients.Count} recipient(s)."
        );

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(schedule));
    }

    private async Task<ReportSchedule> GetOrCreateScheduleAsync(
        CancellationToken cancellationToken
    )
    {
        var schedule = await _context.ReportSchedules
            .OrderBy(item => item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (schedule != null)
        {
            return schedule;
        }

        schedule = new ReportSchedule();
        _context.ReportSchedules.Add(schedule);
        await _context.SaveChangesAsync(cancellationToken);
        return schedule;
    }

    private static string? ValidateRecipients(
        IReadOnlyCollection<string> recipients,
        bool requireRecipient
    )
    {
        if (requireRecipient && recipients.Count == 0)
        {
            return "At least one report recipient is required.";
        }

        if (recipients.Count > 10)
        {
            return "A maximum of 10 report recipients is allowed.";
        }

        var validator = new EmailAddressAttribute();
        var invalid = recipients.FirstOrDefault(recipient =>
            !validator.IsValid(recipient)
        );

        return invalid == null
            ? null
            : $"'{invalid}' is not a valid email address.";
    }

    private static ReportScheduleDto ToDto(
        ReportSchedule schedule
    ) => new()
    {
        Enabled = schedule.Enabled,
        Frequency = schedule.Frequency,
        Recipients = schedule.Recipients,
        LastSentAtUtc = schedule.LastSentAtUtc,
        NextRunAtUtc = schedule.NextRunAtUtc,
        LastDeliveryStatus = schedule.LastDeliveryStatus,
        LastError = schedule.LastError,
        UpdatedAtUtc = schedule.UpdatedAtUtc
    };
}
