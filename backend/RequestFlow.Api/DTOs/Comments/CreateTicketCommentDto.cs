using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs.Comments;

public class CreateTicketCommentDto
{
    [Required(ErrorMessage = "Comment content is required.")]
    [StringLength(
        1000,
        MinimumLength = 1,
        ErrorMessage = "Comment must be between 1 and 1000 characters."
    )]
    public string Content { get; set; } = string.Empty;
}