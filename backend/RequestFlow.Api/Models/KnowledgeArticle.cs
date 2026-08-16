using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.Models;

public class KnowledgeArticle
{
    public int Id { get; set; }

    [Required]
    [MaxLength(180)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ArticleType { get; set; } = "Guide";

    [Required]
    [MaxLength(320)]
    public string Summary { get; set; } = string.Empty;

    [Required]
    [MaxLength(6000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(240)]
    public string Keywords { get; set; } = string.Empty;

    public bool IsPublished { get; set; } = true;

    public int DisplayOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
