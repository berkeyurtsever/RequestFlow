namespace RequestFlow.Api.Models;

public class UserNotificationPreference
{
    public int UserId { get; set; }

    public bool EmailEnabled { get; set; } = true;

    public bool NotifyAssignment { get; set; } = true;

    public bool NotifyStatusChange { get; set; } = true;

    public bool NotifyComments { get; set; } = true;

    public bool NotifySla { get; set; } = true;

    public DateTime UpdatedAt { get; set; } =
        DateTime.UtcNow;

    public User? User { get; set; }
}
