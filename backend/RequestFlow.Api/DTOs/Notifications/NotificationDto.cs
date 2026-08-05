namespace RequestFlow.Api.DTOs.Notifications;

public class NotificationDto
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int? TicketId { get; set; }

    public string Type { get; set; } =
        string.Empty;

    public string Title { get; set; } =
        string.Empty;

    public string Message { get; set; } =
        string.Empty;

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReadAt { get; set; }
}