using RequestFlow.Api.Data;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Services;

public class TicketActivityService
    : ITicketActivityService
{
    private readonly AppDbContext _context;

    public TicketActivityService(
        AppDbContext context
    )
    {
        _context = context;
    }

    public async Task<TicketActivity> AddActivityAsync(
        int ticketId,
        int? actorUserId,
        string actorName,
        string actorRole,
        string type,
        string title,
        string description,
        bool saveChanges = true
    )
    {
        var activity = new TicketActivity
        {
            TicketId = ticketId,
            ActorUserId = actorUserId,
            ActorName = string.IsNullOrWhiteSpace(actorName)
                ? "RequestFlow"
                : actorName.Trim(),
            ActorRole = string.IsNullOrWhiteSpace(actorRole)
                ? "System"
                : actorRole.Trim(),
            Type = string.IsNullOrWhiteSpace(type)
                ? "update"
                : type.Trim(),
            Title = string.IsNullOrWhiteSpace(title)
                ? "Request updated"
                : title.Trim(),
            Description = string.IsNullOrWhiteSpace(description)
                ? "Request information was updated."
                : description.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.TicketActivities.Add(activity);

        if (saveChanges)
        {
            await _context.SaveChangesAsync();
        }

        return activity;
    }
}