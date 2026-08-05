namespace RequestFlow.Api.Models;

public class SystemSetting
{
    public int Id { get; set; }

    public string SystemName { get; set; } =
        "RequestFlow";

    public string SystemDescription { get; set; } =
        "Company request tracking and workflow management system.";

    public string DefaultPriority { get; set; } =
        "Medium";

    public bool AutoAssignment { get; set; } =
        false;

    public bool EmailNotifications { get; set; } =
        true;

    public bool NotifyNewRequest { get; set; } =
        true;

    public bool NotifyAssignment { get; set; } =
        true;

    public bool NotifyStatusChange { get; set; } =
        true;

    public bool NotifyComments { get; set; } =
        true;

    public DateTime UpdatedAt { get; set; } =
        DateTime.UtcNow;

    public int? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}