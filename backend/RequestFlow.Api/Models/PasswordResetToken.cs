using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.Models;

public class PasswordResetToken
{
    public long Id { get; set; }

    public int UserId { get; set; }

    public User User { get; set; } = null!;

    [Required]
    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } =
        DateTime.UtcNow;

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? UsedAtUtc { get; set; }
}
