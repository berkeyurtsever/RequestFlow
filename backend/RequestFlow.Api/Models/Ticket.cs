using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.Models;

public class Ticket
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } =
        string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } =
        string.Empty;

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } =
        string.Empty;

    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } =
        "Medium";

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } =
        "Open";

    public int? CreatedByUserId { get; set; }

    public User? CreatedByUser { get; set; }

    public int? AssignedToUserId { get; set; }

    public User? AssignedToUser { get; set; }

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<TicketComment> Comments
    {
        get;
        set;
    } = new List<TicketComment>();

    public ICollection<TicketAttachment> Attachments
    {
        get;
        set;
    } = new List<TicketAttachment>();

    public ICollection<TicketActivity> Activities
    {
        get;
        set;
    } = new List<TicketActivity>();
}