namespace RequestFlow.Api.Services;

public sealed record ReportPeriodRange(
    string Key,
    string Label,
    DateTime? FromUtc,
    DateTime ToUtc
);

public static class ReportPeriodResolver
{
    public static ReportPeriodRange Resolve(
        string? period,
        DateTime? nowUtc = null
    )
    {
        var now = nowUtc ?? DateTime.UtcNow;
        var normalized = period?.Trim().ToLowerInvariant();

        return normalized switch
        {
            "week" or "weekly" => new ReportPeriodRange(
                "week",
                "Last 7 days",
                now.AddDays(-7),
                now
            ),
            "month" or "monthly" => new ReportPeriodRange(
                "month",
                "Last 30 days",
                now.AddDays(-30),
                now
            ),
            _ => new ReportPeriodRange(
                "all",
                "All time",
                null,
                now
            )
        };
    }
}
