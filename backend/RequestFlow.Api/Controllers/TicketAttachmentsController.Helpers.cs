using System.Security.Claims;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

public partial class TicketAttachmentsController
{
    private void AddNotifications(
        Ticket ticket,
        IEnumerable<int?> recipientUserIds,
        int actorUserId,
        string type,
        string title,
        string message,
        DateTime createdAt
    )
    {
#pragma warning disable CS8629 // Nullable value type may be null.
        var uniqueRecipientIds =
            recipientUserIds
                .Where(userId =>
                    userId.HasValue &&
                    userId.Value > 0 &&
                    userId.Value != actorUserId
                )
                .Select(userId =>
                    userId.Value
                )
                .Distinct()
                .ToList();
#pragma warning restore CS8629 // Nullable value type may be null.

        foreach (
            var recipientUserId
            in uniqueRecipientIds
        )
        {
            var notification =
                new Notification
                {
                    UserId =
                        recipientUserId,
                    TicketId =
                        ticket.Id,
                    Type =
                        NormalizeText(
                            type,
                            30,
                            "attachment"
                        ),
                    Title =
                        NormalizeText(
                            title,
                            150,
                            "New attachment"
                        ),
                    Message =
                        NormalizeText(
                            message,
                            500,
                            "A new attachment was uploaded to a request."
                        ),
                    IsRead = false,
                    CreatedAt =
                        createdAt,
                    ReadAt = null
                };

            _context.Notifications.Add(
                notification
            );
        }
    }

    private string GetPhysicalPath(
        string relativePath
    )
    {
        var normalizedPath =
            relativePath.Replace(
                '/',
                Path.DirectorySeparatorChar
            );

        return Path.Combine(
            _environment.ContentRootPath,
            normalizedPath
        );
    }

    private bool TryGetCurrentUserId(
        out int currentUserId
    )
    {
        var userIdValue =
            User.FindFirst("sub")?.Value ??
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        return int.TryParse(
            userIdValue,
            out currentUserId
        );
    }

    private string GetCurrentRole()
    {
        var role =
            User.FindFirst("role")?.Value ??
            User.FindFirst(
                ClaimTypes.Role
            )?.Value ??
            "User";

        return role
            .Trim()
            .ToLowerInvariant();
    }

    private static bool IsManagementRole(
        string role
    )
    {
        return role == "admin" ||
               role == "supervisor";
    }

    private static bool CanAccessTicket(
        Ticket ticket,
        int currentUserId,
        string role
    )
    {
        if (IsManagementRole(role))
        {
            return true;
        }

        if (role == "staff")
        {
            return ticket.AssignedToUserId ==
                   currentUserId;
        }

        return ticket.CreatedByUserId ==
               currentUserId;
    }

    private static string NormalizeFileName(
        string fileName
    )
    {
        var safeFileName =
            Path.GetFileName(fileName)
                .Trim();

        if (
            string.IsNullOrWhiteSpace(
                safeFileName
            )
        )
        {
            return "attachment";
        }

        if (safeFileName.Length <= 255)
        {
            return safeFileName;
        }

        var extension =
            Path.GetExtension(safeFileName);

        var nameWithoutExtension =
            Path.GetFileNameWithoutExtension(
                safeFileName
            );

        var maximumNameLength =
            Math.Max(
                1,
                255 - extension.Length
            );

        return
            $"{nameWithoutExtension[..Math.Min(nameWithoutExtension.Length, maximumNameLength)]}{extension}";
    }

    private static string NormalizeContentType(
        string? contentType
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                contentType
            )
        )
        {
            return "application/octet-stream";
        }

        var normalized =
            contentType.Trim();

        return normalized.Length > 150
            ? normalized[..150]
            : normalized;
    }

    private static string NormalizeText(
        string? value,
        int maximumLength,
        string fallback
    )
    {
        var normalizedValue =
            string.IsNullOrWhiteSpace(value)
                ? fallback
                : value.Trim();

        return normalizedValue.Length >
               maximumLength
            ? normalizedValue[
                ..maximumLength
            ]
            : normalizedValue;
    }
}
