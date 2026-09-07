using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.Models;

public sealed class UserSession
{
    public int Id { get; set; }

    public int UserId { get; set; }

    [Required]
    [MaxLength(64)]
    public string TokenId { get; set; } = string.Empty;

    [MaxLength(320)]
    public string UserAgent { get; set; } = string.Empty;

    [MaxLength(64)]
    public string IpAddress { get; set; } = string.Empty;

    public DateTime SignedInAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAtUtc { get; set; }

    public User? User { get; set; }
}
