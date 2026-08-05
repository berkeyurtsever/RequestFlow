using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs;

public class UpdateCategoryDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Description { get; set; } =
        string.Empty;

    public bool IsActive { get; set; }
}