namespace RequestFlow.Api.Services;

public static class SlaPolicy
{
    public static DateTime CalculateDueAt(
        string? priority,
        DateTime startedAt
    )
    {
        var hours = priority?.Trim().ToLowerInvariant() switch
        {
            "urgent" => 4,
            "high" => 24,
            "low" => 72,
            _ => 48
        };

        return startedAt.ToUniversalTime().AddHours(hours);
    }

    public static bool IsClosed(string? status)
    {
        return status?.Trim().ToLowerInvariant() is
            "resolved" or "rejected" or "completed";
    }
}
