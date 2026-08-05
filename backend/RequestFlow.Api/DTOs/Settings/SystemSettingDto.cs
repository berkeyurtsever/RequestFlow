namespace RequestFlow.Api.DTOs.Settings;

public class SystemSettingDto
{
    public int Id { get; set; }

    public string SystemName { get; set; } =
        string.Empty;

    public string SystemDescription { get; set; } =
        string.Empty;

    public string DefaultPriority { get; set; } =
        "Medium";

    public bool AutoAssignment { get; set; }

    public bool EmailNotifications { get; set; }

    public bool NotifyNewRequest { get; set; }

    public bool NotifyAssignment { get; set; }

    public bool NotifyStatusChange { get; set; }

    public bool NotifyComments { get; set; }

    public DateTime UpdatedAt { get; set; }

    public int? UpdatedByUserId { get; set; }

    public string? UpdatedByUserName { get; set; }
}