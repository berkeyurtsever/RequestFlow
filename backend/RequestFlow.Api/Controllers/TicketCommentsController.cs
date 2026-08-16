using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Comments;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/Tickets/{ticketId:int}/comments")]
public class TicketCommentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TicketCommentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TicketCommentDto>>> GetComments(
        int ticketId)
    {
        var currentUserId = GetCurrentUserId();

        if (currentUserId == null)
        {
            return Unauthorized();
        }

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(ticket => ticket.Id == ticketId);

        if (ticket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        if (!CanAccessTicket(ticket, currentUserId.Value))
        {
            return Forbid();
        }

        var comments = await _context.TicketComments
            .AsNoTracking()
            .Where(comment => comment.TicketId == ticketId)
            .OrderBy(comment => comment.CreatedAt)
            .Select(comment => new TicketCommentDto
            {
                Id = comment.Id,
                TicketId = comment.TicketId,
                AuthorUserId = comment.AuthorUserId,
                AuthorName = comment.AuthorName,
                AuthorRole = comment.AuthorRole,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost]
    public async Task<ActionResult<TicketCommentDto>> CreateComment(
        int ticketId,
        [FromBody] CreateTicketCommentDto dto)
    {
        var currentUserId = GetCurrentUserId();

        if (currentUserId == null)
        {
            return Unauthorized();
        }

        var content = dto.Content?.Trim();

        if (string.IsNullOrWhiteSpace(content))
        {
            return BadRequest(new
            {
                message = "Comment content is required."
            });
        }

        if (content.Length > 2000)
        {
            return BadRequest(new
            {
                message = "Comment cannot be longer than 2000 characters."
            });
        }

        var ticket = await _context.Tickets
            .FirstOrDefaultAsync(ticket => ticket.Id == ticketId);

        if (ticket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        if (!CanAccessTicket(ticket, currentUserId.Value))
        {
            return Forbid();
        }

        var currentUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == currentUserId.Value);

        if (currentUser == null)
        {
            return Unauthorized(new
            {
                message = "The current user could not be found."
            });
        }

        var comment = new TicketComment
        {
            TicketId = ticket.Id,
            AuthorUserId = currentUser.Id,
            AuthorName = currentUser.FullName,
            AuthorRole = currentUser.Role,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };

        _context.TicketComments.Add(comment);

        _context.TicketActivities.Add(new TicketActivity
        {
            TicketId = ticket.Id,
            ActorUserId = currentUser.Id,
            ActorName = currentUser.FullName,
            ActorRole = currentUser.Role,
            Type = "comment",
            Title = "Comment added",
            Description = "A new comment was added to the request.",
            CreatedAt = DateTime.UtcNow
        });

        var commentNotificationsEnabled =
            await AreCommentNotificationsEnabledAsync();

        if (commentNotificationsEnabled)
        {
            await AddNotificationsAsync(
                ticket,
                currentUser.Id,
                "Comment",
                "New comment added",
                $"{currentUser.FullName} added a comment to request #{ticket.Id}."
            );
        }

        ticket.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var result = new TicketCommentDto
        {
            Id = comment.Id,
            TicketId = comment.TicketId,
            AuthorUserId = comment.AuthorUserId,
            AuthorName = comment.AuthorName,
            AuthorRole = comment.AuthorRole,
            Content = comment.Content,
            CreatedAt = comment.CreatedAt
        };

        return Ok(result);
    }

    [HttpDelete("{commentId:int}")]
    public async Task<IActionResult> DeleteComment(
        int ticketId,
        int commentId)
    {
        var currentUserId = GetCurrentUserId();

        if (currentUserId == null)
        {
            return Unauthorized();
        }

        var ticket = await _context.Tickets
            .FirstOrDefaultAsync(ticket => ticket.Id == ticketId);

        if (ticket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        if (!CanAccessTicket(ticket, currentUserId.Value))
        {
            return Forbid();
        }

        var comment = await _context.TicketComments
            .FirstOrDefaultAsync(comment =>
                comment.Id == commentId &&
                comment.TicketId == ticketId
            );

        if (comment == null)
        {
            return NotFound(new
            {
                message = "Comment could not be found."
            });
        }

        var canDelete =
            comment.AuthorUserId == currentUserId.Value ||
            IsManagementUser();

        if (!canDelete)
        {
            return Forbid();
        }

        var currentUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == currentUserId.Value);

        _context.TicketComments.Remove(comment);

        _context.TicketActivities.Add(new TicketActivity
        {
            TicketId = ticket.Id,
            ActorUserId = currentUserId.Value,
            ActorName = currentUser?.FullName ?? "Unknown User",
            ActorRole = currentUser?.Role ?? "User",
            Type = "comment",
            Title = "Comment deleted",
            Description = "A comment was deleted from the request.",
            CreatedAt = DateTime.UtcNow
        });

        ticket.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task AddNotificationsAsync(
        Ticket ticket,
        int actorUserId,
        string type,
        string title,
        string message)
    {
        var recipientIds = new HashSet<int>();

        if (ticket.CreatedByUserId.HasValue &&
            ticket.CreatedByUserId.Value != actorUserId)
        {
            recipientIds.Add(ticket.CreatedByUserId.Value);
        }

        if (ticket.AssignedToUserId.HasValue &&
            ticket.AssignedToUserId.Value != actorUserId)
        {
            recipientIds.Add(ticket.AssignedToUserId.Value);
        }

        foreach (var recipientId in recipientIds)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = recipientId,
                TicketId = ticket.Id,
                Type = type,
                Title = title,
                Message = message,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        await Task.CompletedTask;
    }

    private async Task<bool> AreCommentNotificationsEnabledAsync()
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync();

        return settings?.NotifyComments ?? true;
    }

    private bool CanAccessTicket(
        Ticket ticket,
        int currentUserId)
    {
        var role = GetCurrentUserRole();

        if (role is "Admin" or "Supervisor")
        {
            return true;
        }

        if (role == "Staff")
        {
            return ticket.AssignedToUserId == currentUserId;
        }

        return ticket.CreatedByUserId == currentUserId;
    }

    private bool IsManagementUser()
    {
        var role = GetCurrentUserRole();

        return role is "Admin" or "Supervisor";
    }

    private int? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue("sub") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(userIdValue, out var userId)
            ? userId
            : null;
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirstValue("role") ??
               User.FindFirstValue(ClaimTypes.Role) ??
               "User";
    }
}
