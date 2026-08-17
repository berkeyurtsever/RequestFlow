namespace RequestFlow.Api.DTOs.Reports;

public sealed class ReportDto
{
    public string Period { get; set; } = "all";

    public string PeriodLabel { get; set; } = "All time";

    public DateTime? FromUtc { get; set; }

    public DateTime ToUtc { get; set; }

    public int TotalRequests { get; set; }

    public int OpenRequests { get; set; }

    public int InProgressRequests { get; set; }

    public int PendingRequests { get; set; }

    public int CompletedRequests { get; set; }

    public int RejectedRequests { get; set; }

    public int OverdueRequests { get; set; }

    public int DueSoonRequests { get; set; }

    public double AverageResolutionHours { get; set; }

    public List<ReportStatusDto> StatusData { get; set; } = [];

    public List<ReportCategoryDto> CategoryData { get; set; } = [];

    public List<ReportStatusDto> PriorityData { get; set; } = [];

    public List<ReportRequestDto> RecentRequests { get; set; } = [];
}

public sealed class ReportStatusDto
{
    public string Name { get; set; } = string.Empty;

    public int Value { get; set; }
}

public sealed class ReportCategoryDto
{
    public string Name { get; set; } = string.Empty;

    public int Requests { get; set; }

    public double Percentage { get; set; }

    public string Intensity { get; set; } = "Low";
}

public sealed class ReportRequestDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? SlaDueAt { get; set; }

    public DateTime? SlaBreachedAt { get; set; }
}
