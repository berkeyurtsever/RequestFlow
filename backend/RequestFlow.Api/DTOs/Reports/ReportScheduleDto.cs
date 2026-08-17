using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs.Reports;

public sealed class ReportScheduleDto
{
    public bool Enabled { get; set; }

    public string Frequency { get; set; } = "Weekly";

    public string Recipients { get; set; } = string.Empty;

    public DateTime? LastSentAtUtc { get; set; }

    public DateTime? NextRunAtUtc { get; set; }

    public string LastDeliveryStatus { get; set; } = "Not sent";

    public string? LastError { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class UpdateReportScheduleDto
{
    public bool Enabled { get; set; }

    [Required]
    public string Frequency { get; set; } = "Weekly";

    [StringLength(1500)]
    public string Recipients { get; set; } = string.Empty;
}
