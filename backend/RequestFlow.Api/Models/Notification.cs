namespace RequestFlow.Api.Models;

public class Notification
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int? TicketId { get; set; }

    public string Type { get; set; } =
        "update";

    public string Title { get; set; } =
        string.Empty;

    public string Message { get; set; } =
        string.Empty;

    public bool IsRead { get; set; } =
        false;

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    public DateTime? ReadAt { get; set; }

    public string EmailDeliveryStatus { get; set; } =
        "Pending";

    public DateTime? EmailDeliveredAt { get; set; }

    public User? User { get; set; }

    public Ticket? Ticket { get; set; }
}
