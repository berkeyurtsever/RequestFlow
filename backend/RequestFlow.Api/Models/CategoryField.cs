using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.Models;

public class CategoryField
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string Label { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string FieldType { get; set; } = "text";

    [MaxLength(180)]
    public string Placeholder { get; set; } = string.Empty;

    [MaxLength(300)]
    public string HelpText { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string OptionsJson { get; set; } = "[]";

    public bool IsRequired { get; set; }

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
