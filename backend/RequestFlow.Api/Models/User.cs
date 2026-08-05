using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RequestFlow.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } =
        string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } =
        string.Empty;

    [Required]
    public string PasswordHash { get; set; } =
        string.Empty;

    [Required]
    [MaxLength(30)]
    public string Role { get; set; } = "User";

    public DateTime CreatedAt { get; set; } =
        DateTime.UtcNow;

    [JsonIgnore]
    public ICollection<Ticket> CreatedTickets
    {
        get;
        set;
    } = new List<Ticket>();

    [JsonIgnore]
    public ICollection<Ticket> AssignedTickets
    {
        get;
        set;
    } = new List<Ticket>();
}