namespace RequestFlow.Api.DTOs;

public sealed class DashboardPreferenceDto
{
    public List<string> VisibleCards { get; set; } = new();
}

public sealed class DashboardAnalyticsDto
{
    public int Days { get; set; }
    public double? AverageFirstResponseHours { get; set; }
    public int FirstResponseSampleSize { get; set; }
    public double? AverageResolutionHours { get; set; }
    public int ResolutionSampleSize { get; set; }
    public double? SlaSuccessRate { get; set; }
    public int SlaEvaluatedCount { get; set; }
    public int SlaMetCount { get; set; }
    public int SlaBreachedCount { get; set; }
    public List<PersonnelWorkloadDto> PersonnelWorkload { get; set; } = new();
}

public sealed class PersonnelWorkloadDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Active { get; set; }
    public int Resolved { get; set; }
    public int Overdue { get; set; }
    public int Total { get; set; }
    public int UtilizationPercentage { get; set; }
}
