using System.Security.Claims;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Services;

public interface IAuditLogService
{
    void Add(
        ClaimsPrincipal actor,
        string action,
        string entityType,
        string? entityId,
        string summary
    );

    void AddSystem(
        string action,
        string entityType,
        string? entityId,
        string summary
    );
}

public sealed class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _context;

    public AuditLogService(AppDbContext context)
    {
        _context = context;
    }

    public void Add(
        ClaimsPrincipal actor,
        string action,
        string entityType,
        string? entityId,
        string summary
    )
    {
        var actorIdValue = actor.FindFirst("sub")?.Value ??
            actor.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        _context.AuditLogs.Add(new AuditLog
        {
            ActorUserId = int.TryParse(actorIdValue, out var actorId)
                ? actorId
                : null,
            ActorName = Normalize(
                actor.FindFirst("name")?.Value ??
                actor.Identity?.Name,
                100,
                "Unknown User"
            ),
            ActorRole = Normalize(
                actor.FindFirst("role")?.Value ??
                actor.FindFirst(ClaimTypes.Role)?.Value,
                30,
                "User"
            ),
            Action = Normalize(action, 60, "updated"),
            EntityType = Normalize(entityType, 60, "entity"),
            EntityId = NormalizeOptional(entityId, 80),
            Summary = Normalize(summary, 500, "An administrative change was made."),
            CreatedAt = DateTime.UtcNow
        });
    }

    public void AddSystem(
        string action,
        string entityType,
        string? entityId,
        string summary
    )
    {
        _context.AuditLogs.Add(new AuditLog
        {
            ActorName = "RequestFlow",
            ActorRole = "System",
            Action = Normalize(action, 60, "updated"),
            EntityType = Normalize(entityType, 60, "entity"),
            EntityId = NormalizeOptional(entityId, 80),
            Summary = Normalize(summary, 500, "An automated change was made."),
            CreatedAt = DateTime.UtcNow
        });
    }

    private static string Normalize(
        string? value,
        int maximumLength,
        string fallback
    )
    {
        var result = string.IsNullOrWhiteSpace(value)
            ? fallback
            : value.Trim();

        return result.Length <= maximumLength
            ? result
            : result[..maximumLength];
    }

    private static string? NormalizeOptional(
        string? value,
        int maximumLength
    )
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var result = value.Trim();
        return result.Length <= maximumLength
            ? result
            : result[..maximumLength];
    }
}
