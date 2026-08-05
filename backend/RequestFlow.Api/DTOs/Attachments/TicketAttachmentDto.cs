namespace RequestFlow.Api.DTOs.Attachments;

public class TicketAttachmentDto
{
    public int Id { get; set; }

    public int TicketId { get; set; }

    public int? UploadedByUserId { get; set; }

    public string UploadedByName { get; set; } =
        string.Empty;

    public string OriginalFileName { get; set; } =
        string.Empty;

    public string ContentType { get; set; } =
        string.Empty;

    public long FileSize { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool CanDelete { get; set; }
}