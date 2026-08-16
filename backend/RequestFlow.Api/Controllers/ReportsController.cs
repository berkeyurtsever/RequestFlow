using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ManagementOnly")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IReportPdfService _pdfService;

    public ReportsController(
        AppDbContext context,
        IReportPdfService pdfService
    )
    {
        _context = context;
        _pdfService = pdfService;
    }

    [HttpGet("pdf")]
    public async Task<IActionResult> DownloadPdf(
        CancellationToken cancellationToken
    )
    {
        var content = await _pdfService.GenerateAsync(
            cancellationToken
        );

        return File(
            content,
            "application/pdf",
            $"requestflow-report-{DateTime.UtcNow:yyyy-MM-dd}.pdf"
        );
    }

    [HttpGet]
    public async Task<IActionResult> GetReports()
    {
        var tickets = await _context.Tickets
            .AsNoTracking()
            .OrderByDescending(ticket => ticket.CreatedAt)
            .ToListAsync();

        var totalRequests = tickets.Count;

        var openRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Open",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var inProgressRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "In Progress",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var pendingRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Pending",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var completedRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Resolved",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var rejectedRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Rejected",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var now = DateTime.UtcNow;
        var overdueRequests = tickets.Count(ticket =>
            !SlaPolicy.IsClosed(ticket.Status) &&
            ticket.SlaDueAt.HasValue &&
            ticket.SlaDueAt.Value <= now
        );

        var dueSoonRequests = tickets.Count(ticket =>
            !SlaPolicy.IsClosed(ticket.Status) &&
            ticket.SlaDueAt.HasValue &&
            ticket.SlaDueAt.Value > now &&
            ticket.SlaDueAt.Value <= now.AddHours(8)
        );

        var statusData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Status)
                    ? "Unknown"
                    : ticket.Status.Trim()
            )
            .Select(group => new
            {
                name = group.Key,
                value = group.Count()
            })
            .OrderByDescending(item => item.value)
            .ToList();

        var categoryData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Category)
                    ? "Uncategorized"
                    : ticket.Category.Trim()
            )
            .Select(group => new
            {
                name = group.Key,
                requests = group.Count()
            })
            .OrderByDescending(item => item.requests)
            .ToList();

        var priorityData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Priority)
                    ? "Unknown"
                    : ticket.Priority.Trim()
            )
            .Select(group => new
            {
                name = group.Key,
                value = group.Count()
            })
            .OrderByDescending(item => item.value)
            .ToList();

        var recentRequests = tickets
            .Take(5)
            .Select(ticket => new
            {
                ticket.Id,
                ticket.Title,
                ticket.Category,
                ticket.Status,
                ticket.Priority,
                ticket.CreatedAt,
                ticket.SlaDueAt,
                ticket.SlaBreachedAt
            })
            .ToList();

        var resolvedTickets = tickets
            .Where(ticket =>
                ticket.Status.Equals(
                    "Resolved",
                    StringComparison.OrdinalIgnoreCase
                ) &&
                ticket.UpdatedAt.HasValue
            )
            .ToList();

        var averageResolutionHours =
            resolvedTickets.Count == 0
                ? 0
                : Math.Round(
                    resolvedTickets.Average(ticket =>
                        (
                            ticket.UpdatedAt!.Value -
                            ticket.CreatedAt
                        ).TotalHours
                    ),
                    1
                );

        var result = new
        {
            totalRequests,
            openRequests,
            inProgressRequests,
            pendingRequests,
            completedRequests,
            rejectedRequests,
            overdueRequests,
            dueSoonRequests,
            averageResolutionHours,
            statusData,
            categoryData,
            priorityData,
            recentRequests
        };

        return Ok(result);
    }
}
