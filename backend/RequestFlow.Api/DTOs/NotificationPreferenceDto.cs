namespace RequestFlow.Api.DTOs;

public sealed class NotificationPreferenceDto
{
    public bool EmailEnabled { get; set; } = true;
    public bool NotifyAssignment { get; set; } = true;
    public bool NotifyStatusChange { get; set; } = true;
    public bool NotifyComments { get; set; } = true;
    public bool NotifySla { get; set; } = true;
}
