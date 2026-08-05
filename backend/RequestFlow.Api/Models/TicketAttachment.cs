namespace RequestFlow.Api.Models;

public class TicketAttachment
{
    public int Id { get; set; }

    public int TicketId { get; set; }

    public Ticket Ticket { get; set; } = null!;

    public int? UploadedByUserId { get; set; }

    public User? UploadedByUser { get; set; }

    public string UploadedByName { get; set; } =
        string.Empty;

    public string OriginalFileName { get; set; } =
        string.Empty;

    public string StoredFileName { get; set; } =
        string.Empty;

    public string RelativePath { get; set; } =
        string.Empty;

    public string ContentType { get; set; } =
        "application/octet-stream";

    public long FileSize { get; set; }

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;
}