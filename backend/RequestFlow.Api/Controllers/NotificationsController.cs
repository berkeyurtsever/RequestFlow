using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Notifications;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public NotificationsController(
        AppDbContext context
    )
    {
        _context = context;
    }

    [HttpGet]
    public async Task<
        ActionResult<List<NotificationDto>>
    > GetNotifications()
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var notifications =
            await _context.Notifications
                .AsNoTracking()
                .Where(notification =>
                    notification.UserId ==
                    currentUserId
                )
                .OrderByDescending(
                    notification =>
                        notification.CreatedAt
                )
                .Take(30)
                .Select(notification =>
                    new NotificationDto
                    {
                        Id =
                            notification.Id,

                        UserId =
                            notification.UserId,

                        TicketId =
                            notification.TicketId,

                        Type =
                            notification.Type,

                        Title =
                            notification.Title,

                        Message =
                            notification.Message,

                        IsRead =
                            notification.IsRead,

                        CreatedAt =
                            notification.CreatedAt,

                        ReadAt =
                            notification.ReadAt
                    }
                )
                .ToListAsync();

        return Ok(notifications);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult>
        GetUnreadCount()
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var unreadCount =
            await _context.Notifications
                .CountAsync(notification =>
                    notification.UserId ==
                        currentUserId &&
                    !notification.IsRead
                );

        return Ok(new
        {
            unreadCount
        });
    }

    [HttpPatch("{id:int}/read")]
    public async Task<
        ActionResult<NotificationDto>
    > MarkAsRead(int id)
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var notification =
            await _context.Notifications
                .FirstOrDefaultAsync(
                    notification =>
                        notification.Id == id &&
                        notification.UserId ==
                        currentUserId
                );

        if (notification == null)
        {
            return NotFound(new
            {
                message =
                    "Notification could not be found."
            });
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt =
                DateTime.UtcNow;

            await _context
                .SaveChangesAsync();
        }

        return Ok(
            MapNotification(notification)
        );
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult>
        MarkAllAsRead()
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var unreadNotifications =
            await _context.Notifications
                .Where(notification =>
                    notification.UserId ==
                        currentUserId &&
                    !notification.IsRead
                )
                .ToListAsync();

        if (
            unreadNotifications.Count == 0
        )
        {
            return Ok(new
            {
                updatedCount = 0,
                message =
                    "There are no unread notifications."
            });
        }

        var readAt = DateTime.UtcNow;

        foreach (
            var notification
            in unreadNotifications
        )
        {
            notification.IsRead = true;
            notification.ReadAt = readAt;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            updatedCount =
                unreadNotifications.Count,

            message =
                "All notifications were marked as read."
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult>
        DeleteNotification(int id)
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var notification =
            await _context.Notifications
                .FirstOrDefaultAsync(
                    notification =>
                        notification.Id == id &&
                        notification.UserId ==
                        currentUserId
                );

        if (notification == null)
        {
            return NotFound(new
            {
                message =
                    "Notification could not be found."
            });
        }

        _context.Notifications.Remove(
            notification
        );

        await _context.SaveChangesAsync();

        return NoContent();
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

    private static NotificationDto
        MapNotification(
            Models.Notification notification
        )
    {
        return new NotificationDto
        {
            Id = notification.Id,

            UserId =
                notification.UserId,

            TicketId =
                notification.TicketId,

            Type =
                notification.Type,

            Title =
                notification.Title,

            Message =
                notification.Message,

            IsRead =
                notification.IsRead,

            CreatedAt =
                notification.CreatedAt,

            ReadAt =
                notification.ReadAt
        };
    }
}