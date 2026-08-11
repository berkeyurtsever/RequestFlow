using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

public partial class TicketsController
{
    private async Task<(
        bool NotifyNewRequest,
        bool NotifyAssignment,
        bool NotifyStatusChange
    )> GetNotificationSettingsAsync()
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync();

        return (
            NotifyNewRequest:
                settings?.NotifyNewRequest ?? true,

            NotifyAssignment:
                settings?.NotifyAssignment ?? true,

            NotifyStatusChange:
                settings?.NotifyStatusChange ?? true
        );
    }

    private async Task<User?> GetCurrentUserAsync(
        int currentUserId)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user =>
                user.Id == currentUserId
            );
    }

    private async Task<List<int>> GetManagementUserIdsAsync(
        int excludedUserId)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.Id != excludedUserId &&
                (
                    user.Role == "Admin" ||
                    user.Role == "admin" ||
                    user.Role == "Supervisor" ||
                    user.Role == "supervisor"
                )
            )
            .Select(user => user.Id)
            .ToListAsync();
    }

    private void AddActivity(
        Ticket ticket,
        int actorUserId,
        string actorName,
        string actorRole,
        string type,
        string title,
        string description,
        DateTime createdAt)
    {
        var activity = new TicketActivity
        {
            Ticket = ticket,
            TicketId = ticket.Id,
            ActorUserId = actorUserId,

            ActorName = string.IsNullOrWhiteSpace(actorName)
                ? "RequestFlow User"
                : actorName.Trim(),

            ActorRole = string.IsNullOrWhiteSpace(actorRole)
                ? "User"
                : actorRole.Trim(),

            Type = NormalizeText(
                type,
                maximumLength: 30,
                fallback: "update"
            ),

            Title = NormalizeText(
                title,
                maximumLength: 150,
                fallback: "Request activity"
            ),

            Description = NormalizeText(
                description,
                maximumLength: 500,
                fallback: "The request was updated."
            ),

            CreatedAt = createdAt
        };

        _context.TicketActivities.Add(activity);
    }

    private void AddNotifications(
        Ticket ticket,
        IEnumerable<int?> recipientUserIds,
        int actorUserId,
        string type,
        string title,
        string message,
        DateTime createdAt)
    {
        var uniqueRecipientIds = recipientUserIds
            .Where(userId =>
                userId.HasValue &&
                userId.Value > 0 &&
                userId.Value != actorUserId
            )
            .Select(userId => userId!.Value)
            .Distinct()
            .ToList();

        foreach (var recipientUserId in uniqueRecipientIds)
        {
            var notification = new Notification
            {
                UserId = recipientUserId,
                Ticket = ticket,
                TicketId = ticket.Id,

                Type = NormalizeText(
                    type,
                    maximumLength: 30,
                    fallback: "update"
                ),

                Title = NormalizeText(
                    title,
                    maximumLength: 150,
                    fallback: "Request update"
                ),

                Message = NormalizeText(
                    message,
                    maximumLength: 500,
                    fallback: "A request was updated."
                ),

                IsRead = false,
                CreatedAt = createdAt,
                ReadAt = null
            };

            _context.Notifications.Add(notification);
        }
    }

    private bool TryGetCurrentUserId(
        out int currentUserId)
    {
        var userIdValue =
            User.FindFirst("sub")?.Value ??
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(
            userIdValue,
            out currentUserId
        );
    }

    private string GetCurrentRole()
    {
        var role =
            User.FindFirst("role")?.Value ??
            User.FindFirst(ClaimTypes.Role)?.Value ??
            "User";

        return role
            .Trim()
            .ToLowerInvariant();
    }

    private static bool IsManagementRole(string role)
    {
        return role == "admin" ||
               role == "supervisor";
    }

    private static bool CanAccessTicket(
        Ticket ticket,
        int currentUserId,
        string role)
    {
        if (IsManagementRole(role))
        {
            return true;
        }

        if (role == "staff")
        {
            return ticket.AssignedToUserId == currentUserId;
        }

        return ticket.CreatedByUserId == currentUserId;
    }

    private static bool ValuesEqual(
        string? firstValue,
        string? secondValue)
    {
        return string.Equals(
            firstValue?.Trim(),
            secondValue?.Trim(),
            StringComparison.Ordinal
        );
    }

    private static string NormalizeText(
        string? value,
        int maximumLength,
        string fallback)
    {
        var normalizedValue =
            string.IsNullOrWhiteSpace(value)
                ? fallback
                : value.Trim();

        return normalizedValue.Length > maximumLength
            ? normalizedValue[..maximumLength]
            : normalizedValue;
    }
}
