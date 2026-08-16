using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

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

    public DateTime? SlaDueAt { get; set; }

    public DateTime? SlaBreachedAt { get; set; }

    [JsonIgnore]
    public string CustomFieldsJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, string> CustomFields
    {
        get
        {
            try
            {
                return JsonSerializer.Deserialize<
                    Dictionary<string, string>
                >(CustomFieldsJson) ?? new();
            }
            catch (JsonException)
            {
                return new();
            }
        }
        set
        {
            CustomFieldsJson = JsonSerializer.Serialize(
                value ?? new Dictionary<string, string>()
            );
        }
    }

    [NotMapped]
    public string SlaStatus
    {
        get
        {
            var normalizedStatus = Status
                .Trim()
                .ToLowerInvariant();

            if (normalizedStatus is "resolved" or "rejected" or "completed")
            {
                return "Closed";
            }

            if (SlaBreachedAt.HasValue || SlaDueAt <= DateTime.UtcNow)
            {
                return "Overdue";
            }

            if (SlaDueAt <= DateTime.UtcNow.AddHours(8))
            {
                return "DueSoon";
            }

            return SlaDueAt.HasValue ? "OnTrack" : "NotSet";
        }
    }

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
