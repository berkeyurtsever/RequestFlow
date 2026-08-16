namespace RequestFlow.Api.Models;

public class UserDashboardPreference
{
    public int UserId { get; set; }

    public string VisibleCardsJson { get; set; } = "[]";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
