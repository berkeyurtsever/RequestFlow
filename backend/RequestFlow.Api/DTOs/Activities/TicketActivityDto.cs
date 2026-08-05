namespace RequestFlow.Api.DTOs.Activities;

public class TicketActivityDto
{
    public int Id { get; set; }

    public int TicketId { get; set; }

    public int? ActorUserId { get; set; }

    public string ActorName { get; set; } =
        string.Empty;

    public string ActorRole { get; set; } =
        string.Empty;

    public string Type { get; set; } =
        string.Empty;

    public string Title { get; set; } =
        string.Empty;

    public string Description { get; set; } =
        string.Empty;

    public DateTime CreatedAt { get; set; }
}