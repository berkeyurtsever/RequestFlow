namespace RequestFlow.Api.Models;

public sealed class ReportSchedule
{
    public int Id { get; set; } = 1;

    public bool Enabled { get; set; }

    public string Frequency { get; set; } = "Weekly";

    public string Recipients { get; set; } = string.Empty;

    public DateTime? LastSentAtUtc { get; set; }

    public DateTime? NextRunAtUtc { get; set; }

    public string LastDeliveryStatus { get; set; } = "Not sent";

    public string? LastError { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
