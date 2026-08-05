using RequestFlow.Api.Models;

namespace RequestFlow.Api.Services;

public interface ITicketActivityService
{
    Task<TicketActivity> AddActivityAsync(
        int ticketId,
        int? actorUserId,
        string actorName,
        string actorRole,
        string type,
        string title,
        string description,
        bool saveChanges = true
    );
}