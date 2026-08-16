namespace RequestFlow.Api.Models;

public class AuditLog
{
    public long Id { get; set; }

    public int? ActorUserId { get; set; }

    public string ActorName { get; set; } =
        "System";

    public string ActorRole { get; set; } =
        "System";

    public string Action { get; set; } =
        string.Empty;

    public string EntityType { get; set; } =
        string.Empty;

    public string? EntityId { get; set; }

    public string Summary { get; set; } =
        string.Empty;

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    public User? ActorUser { get; set; }
}
