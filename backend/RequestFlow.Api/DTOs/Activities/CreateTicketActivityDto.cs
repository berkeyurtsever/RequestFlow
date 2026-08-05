using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs.Activities;

public class CreateTicketActivityDto
{
    [Required]
    [StringLength(30)]
    public string Type { get; set; } =
        string.Empty;

    [Required]
    [StringLength(150)]
    public string Title { get; set; } =
        string.Empty;

    [Required]
    [StringLength(500)]
    public string Description { get; set; } =
        string.Empty;
}