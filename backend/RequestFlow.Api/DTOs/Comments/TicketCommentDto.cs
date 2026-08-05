namespace RequestFlow.Api.DTOs.Comments;

public class TicketCommentDto
{
    public int Id { get; set; }

    public int TicketId { get; set; }

    public int AuthorUserId { get; set; }

    public string AuthorName { get; set; } = string.Empty;

    public string AuthorRole { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public bool CanDelete { get; set; }
}