using RequestFlow.Api.Models;

namespace RequestFlow.Api.Services;

public sealed record ReportDeliveryResult(
    bool Sent,
    string Status,
    string? Error = null
);

public interface IReportEmailService
{
    Task<ReportDeliveryResult> SendAsync(
        ReportSchedule schedule,
        CancellationToken cancellationToken = default
    );
}

public sealed class ReportEmailService : IReportEmailService
{
    private readonly IReportPdfService _pdfService;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public ReportEmailService(
        IReportPdfService pdfService,
        IEmailSender emailSender,
        IConfiguration configuration
    )
    {
        _pdfService = pdfService;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    public async Task<ReportDeliveryResult> SendAsync(
        ReportSchedule schedule,
        CancellationToken cancellationToken = default
    )
    {
        if (_configuration.GetValue<bool>("Demo:Enabled"))
        {
            return new ReportDeliveryResult(
                false,
                "Disabled in demo mode",
                "Automatic report emails are disabled in demo mode."
            );
        }

        if (!_emailSender.IsConfigured)
        {
            return new ReportDeliveryResult(
                false,
                "Email not configured",
                "SMTP email delivery is not configured."
            );
        }

        var recipients = ReportScheduleRules.ParseRecipients(
            schedule.Recipients
        );

        if (recipients.Count == 0)
        {
            return new ReportDeliveryResult(
                false,
                "No recipients",
                "At least one valid report recipient is required."
            );
        }

        var period = schedule.Frequency.Equals(
            "Monthly",
            StringComparison.OrdinalIgnoreCase
        ) ? "month" : "week";
        var range = ReportPeriodResolver.Resolve(period);
        var pdf = await _pdfService.GenerateAsync(
            period,
            cancellationToken
        );
        var fileName =
            $"requestflow-{period}-report-{DateTime.UtcNow:yyyy-MM-dd}.pdf";

        await _emailSender.SendReportAsync(
            recipients,
            $"RequestFlow {range.Label} report",
            $"The RequestFlow report for {range.Label.ToLowerInvariant()} is attached as a PDF.",
            pdf,
            fileName,
            cancellationToken
        );

        return new ReportDeliveryResult(true, "Sent");
    }
}

public static class ReportScheduleRules
{
    public static string? NormalizeFrequency(string? frequency)
    {
        if (frequency?.Trim().Equals(
                "Weekly",
                StringComparison.OrdinalIgnoreCase
            ) == true)
        {
            return "Weekly";
        }

        if (frequency?.Trim().Equals(
                "Monthly",
                StringComparison.OrdinalIgnoreCase
            ) == true)
        {
            return "Monthly";
        }

        return null;
    }

    public static List<string> ParseRecipients(string? value)
    {
        return (value ?? string.Empty)
            .Split(
                [',', ';', '\n', '\r'],
                StringSplitOptions.RemoveEmptyEntries |
                StringSplitOptions.TrimEntries
            )
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static DateTime CalculateNextRunUtc(
        string frequency,
        DateTime? nowUtc = null
    )
    {
        var now = nowUtc ?? DateTime.UtcNow;

        if (frequency.Equals(
                "Monthly",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            var candidate = new DateTime(
                now.Year,
                now.Month,
                1,
                6,
                0,
                0,
                DateTimeKind.Utc
            );

            return candidate > now
                ? candidate
                : candidate.AddMonths(1);
        }

        var daysSinceMonday =
            ((int)now.DayOfWeek + 6) % 7;
        var weeklyCandidate = now.Date
            .AddDays(-daysSinceMonday)
            .AddHours(6);

        return weeklyCandidate > now
            ? weeklyCandidate
            : weeklyCandidate.AddDays(7);
    }
}
