using System.Security.Claims;
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

public partial class TicketsController
{
    private async Task<(
        Dictionary<string, string> Values,
        string? ErrorMessage
    )> ValidateAndNormalizeCustomFieldsAsync(
        string category,
        IReadOnlyDictionary<string, string>? suppliedValues
    )
    {
        var fields = await _context.CategoryFields
            .AsNoTracking()
            .Where(field =>
                field.IsActive &&
                field.Category == category
            )
            .OrderBy(field => field.DisplayOrder)
            .ToListAsync();

        var values = suppliedValues ??
            new Dictionary<string, string>();

        if (fields.Count == 0)
        {
            return (new Dictionary<string, string>(), null);
        }

        var allowedKeys = fields
            .Select(field => field.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (values.Keys.Any(key => !allowedKeys.Contains(key)))
        {
            return (
                new Dictionary<string, string>(),
                "One or more category-specific fields are not valid."
            );
        }

        var normalizedValues =
            new Dictionary<string, string>(
                StringComparer.OrdinalIgnoreCase
            );

        foreach (var field in fields)
        {
            values.TryGetValue(field.Key, out var rawValue);
            var value = rawValue?.Trim() ?? string.Empty;

            if (field.IsRequired && string.IsNullOrWhiteSpace(value))
            {
                return (
                    new Dictionary<string, string>(),
                    $"{field.Label} is required."
                );
            }

            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            if (value.Length > 1000)
            {
                return (
                    new Dictionary<string, string>(),
                    $"{field.Label} cannot exceed 1000 characters."
                );
            }

            var fieldType = field.FieldType.Trim().ToLowerInvariant();

            if (
                fieldType == "date" &&
                !DateOnly.TryParse(
                    value,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out _
                )
            )
            {
                return (
                    new Dictionary<string, string>(),
                    $"{field.Label} must be a valid date."
                );
            }

            if (
                fieldType == "number" &&
                !decimal.TryParse(
                    value,
                    NumberStyles.Number,
                    CultureInfo.InvariantCulture,
                    out _
                )
            )
            {
                return (
                    new Dictionary<string, string>(),
                    $"{field.Label} must be a valid number."
                );
            }

            if (fieldType == "select")
            {
                string[] options;

                try
                {
                    options = JsonSerializer.Deserialize<string[]>(
                        field.OptionsJson
                    ) ?? [];
                }
                catch (JsonException)
                {
                    options = [];
                }

                if (!options.Contains(value, StringComparer.OrdinalIgnoreCase))
                {
                    return (
                        new Dictionary<string, string>(),
                        $"{field.Label} contains an invalid selection."
                    );
                }
            }

            normalizedValues[field.Key] = value;
        }

        return (normalizedValues, null);
    }

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
