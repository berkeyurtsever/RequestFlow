namespace RequestFlow.Api.DTOs;

public sealed class UserSessionDto
{
    public int Id { get; set; }
    public string Device { get; set; } = string.Empty;
    public string Network { get; set; } = string.Empty;
    public DateTime SignedInAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public bool IsCurrent { get; set; }
    public bool IsExpired { get; set; }
}
