using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/Tickets")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TicketsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Ticket>>> GetTickets()
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        var role = GetCurrentRole();

        IQueryable<Ticket> query = _context.Tickets
            .AsNoTracking();

        if (role == "staff")
        {
            query = query.Where(ticket =>
                ticket.AssignedToUserId == currentUserId
            );
        }
        else if (!IsManagementRole(role))
        {
            query = query.Where(ticket =>
                ticket.CreatedByUserId == currentUserId
            );
        }

        var tickets = await query
            .OrderByDescending(ticket => ticket.CreatedAt)
            .ToListAsync();

        return Ok(tickets);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Ticket>> GetTicket(int id)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(ticket => ticket.Id == id);

        if (ticket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        var role = GetCurrentRole();

        if (!CanAccessTicket(ticket, currentUserId, role))
        {
            return Forbid();
        }

        return Ok(ticket);
    }

    [HttpPost]
    public async Task<ActionResult<Ticket>> CreateTicket(
        [FromBody] Ticket ticket)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        var currentUser = await GetCurrentUserAsync(currentUserId);

        if (currentUser == null)
        {
            return Unauthorized(new
            {
                message = "The authenticated user could not be found."
            });
        }

        if (string.IsNullOrWhiteSpace(ticket.Title))
        {
            return BadRequest(new
            {
                message = "Request title is required."
            });
        }

        if (string.IsNullOrWhiteSpace(ticket.Description))
        {
            return BadRequest(new
            {
                message = "Request description is required."
            });
        }

        if (string.IsNullOrWhiteSpace(ticket.Category))
        {
            return BadRequest(new
            {
                message = "Request category is required."
            });
        }

        ticket.Id = 0;
        ticket.CreatedByUserId = currentUserId;
        ticket.AssignedToUserId = null;

        ticket.Title = ticket.Title.Trim();
        ticket.Description = ticket.Description.Trim();
        ticket.Category = ticket.Category.Trim();

        ticket.Priority = string.IsNullOrWhiteSpace(ticket.Priority)
            ? "Medium"
            : ticket.Priority.Trim();

        ticket.Status = "Open";
        ticket.CreatedAt = DateTime.UtcNow;
        ticket.UpdatedAt = null;

        _context.Tickets.Add(ticket);

        AddActivity(
            ticket: ticket,
            actorUserId: currentUserId,
            actorName: currentUser.FullName,
            actorRole: currentUser.Role,
            type: "created",
            title: "Request created",
            description: $"Request \"{ticket.Title}\" was created.",
            createdAt: ticket.CreatedAt
        );

        var notificationSettings =
            await GetNotificationSettingsAsync();

        if (notificationSettings.NotifyNewRequest)
        {
            var managementUserIds =
                await GetManagementUserIdsAsync(
                    excludedUserId: currentUserId
                );

            AddNotifications(
                ticket: ticket,
                recipientUserIds: managementUserIds.Select(
                    userId => (int?)userId
                ),
                actorUserId: currentUserId,
                type: "created",
                title: "New request created",
                message:
                    $"{currentUser.FullName} created a new request: \"{ticket.Title}\".",
                createdAt: ticket.CreatedAt
            );
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetTicket),
            new
            {
                id = ticket.Id
            },
            ticket
        );
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTicket(
        int id,
        [FromBody] Ticket updatedTicket)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        var currentUser = await GetCurrentUserAsync(currentUserId);

        if (currentUser == null)
        {
            return Unauthorized(new
            {
                message = "The authenticated user could not be found."
            });
        }

        var existingTicket = await _context.Tickets
            .FirstOrDefaultAsync(ticket => ticket.Id == id);

        if (existingTicket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        var role = GetCurrentRole();

        if (!CanAccessTicket(existingTicket, currentUserId, role))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(updatedTicket.Title))
        {
            return BadRequest(new
            {
                message = "Request title is required."
            });
        }

        if (string.IsNullOrWhiteSpace(updatedTicket.Description))
        {
            return BadRequest(new
            {
                message = "Request description is required."
            });
        }

        if (string.IsNullOrWhiteSpace(updatedTicket.Category))
        {
            return BadRequest(new
            {
                message = "Request category is required."
            });
        }

        var previousTitle = existingTicket.Title;
        var previousDescription = existingTicket.Description;
        var previousCategory = existingTicket.Category;
        var previousPriority = existingTicket.Priority;
        var previousStatus = existingTicket.Status;

        var newTitle = updatedTicket.Title.Trim();
        var newDescription = updatedTicket.Description.Trim();
        var newCategory = updatedTicket.Category.Trim();

        var newPriority =
            string.IsNullOrWhiteSpace(updatedTicket.Priority)
                ? existingTicket.Priority
                : updatedTicket.Priority.Trim();

        var newStatus = existingTicket.Status;

        if (IsManagementRole(role) || role == "staff")
        {
            if (!string.IsNullOrWhiteSpace(updatedTicket.Status))
            {
                newStatus = updatedTicket.Status.Trim();
            }
        }

        existingTicket.Title = newTitle;
        existingTicket.Description = newDescription;
        existingTicket.Category = newCategory;
        existingTicket.Priority = newPriority;
        existingTicket.Status = newStatus;
        existingTicket.UpdatedAt = DateTime.UtcNow;

        var updatedAt = existingTicket.UpdatedAt.Value;

        var notificationSettings =
            await GetNotificationSettingsAsync();

        if (!ValuesEqual(previousStatus, newStatus))
        {
            AddActivity(
                ticket: existingTicket,
                actorUserId: currentUserId,
                actorName: currentUser.FullName,
                actorRole: currentUser.Role,
                type: "status",
                title: "Status changed",
                description:
                    $"Status changed from {previousStatus} to {newStatus}.",
                createdAt: updatedAt
            );

            if (notificationSettings.NotifyStatusChange)
            {
                AddNotifications(
                    ticket: existingTicket,
                    recipientUserIds: new int?[]
                    {
                        existingTicket.CreatedByUserId,
                        existingTicket.AssignedToUserId
                    },
                    actorUserId: currentUserId,
                    type: "status",
                    title: "Request status changed",
                    message:
                        $"Request #{existingTicket.Id} \"{existingTicket.Title}\" changed from {previousStatus} to {newStatus}.",
                    createdAt: updatedAt
                );
            }
        }

        if (!ValuesEqual(previousPriority, newPriority))
        {
            AddActivity(
                ticket: existingTicket,
                actorUserId: currentUserId,
                actorName: currentUser.FullName,
                actorRole: currentUser.Role,
                type: "priority",
                title: "Priority changed",
                description:
                    $"Priority changed from {previousPriority} to {newPriority}.",
                createdAt: updatedAt
            );

            AddNotifications(
                ticket: existingTicket,
                recipientUserIds: new int?[]
                {
                    existingTicket.CreatedByUserId,
                    existingTicket.AssignedToUserId
                },
                actorUserId: currentUserId,
                type: "priority",
                title: "Request priority changed",
                message:
                    $"Request #{existingTicket.Id} \"{existingTicket.Title}\" priority changed from {previousPriority} to {newPriority}.",
                createdAt: updatedAt
            );
        }

        var requestDetailsChanged =
            !ValuesEqual(previousTitle, newTitle) ||
            !ValuesEqual(previousDescription, newDescription) ||
            !ValuesEqual(previousCategory, newCategory);

        if (requestDetailsChanged)
        {
            AddActivity(
                ticket: existingTicket,
                actorUserId: currentUserId,
                actorName: currentUser.FullName,
                actorRole: currentUser.Role,
                type: "update",
                title: "Request details updated",
                description:
                    "The request title, category or description was updated.",
                createdAt: updatedAt
            );

            AddNotifications(
                ticket: existingTicket,
                recipientUserIds: new int?[]
                {
                    existingTicket.CreatedByUserId,
                    existingTicket.AssignedToUserId
                },
                actorUserId: currentUserId,
                type: "update",
                title: "Request details updated",
                message:
                    $"Request #{existingTicket.Id} \"{existingTicket.Title}\" details were updated by {currentUser.FullName}.",
                createdAt: updatedAt
            );
        }

        await _context.SaveChangesAsync();

        return Ok(existingTicket);
    }

    [Authorize(Policy = "ManagementOnly")]
    [HttpPatch("{id:int}/assign")]
    public async Task<IActionResult> AssignTicket(
        int id,
        [FromBody] AssignTicketDto assignTicketDto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        var currentUser = await GetCurrentUserAsync(currentUserId);

        if (currentUser == null)
        {
            return Unauthorized(new
            {
                message = "The authenticated user could not be found."
            });
        }

        var ticket = await _context.Tickets
            .FirstOrDefaultAsync(ticket => ticket.Id == id);

        if (ticket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        var notificationSettings =
            await GetNotificationSettingsAsync();

        var previousAssignedUserId = ticket.AssignedToUserId;

        User? previousAssignedUser = null;

        if (previousAssignedUserId.HasValue)
        {
            previousAssignedUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(user =>
                    user.Id == previousAssignedUserId.Value
                );
        }

        if (!assignTicketDto.AssignedToUserId.HasValue)
        {
            ticket.AssignedToUserId = null;
            ticket.UpdatedAt = DateTime.UtcNow;

            if (previousAssignedUserId.HasValue)
            {
                var previousStaffName =
                    previousAssignedUser?.FullName ??
                    $"User #{previousAssignedUserId.Value}";

                AddActivity(
                    ticket: ticket,
                    actorUserId: currentUserId,
                    actorName: currentUser.FullName,
                    actorRole: currentUser.Role,
                    type: "assignment",
                    title: "Staff assignment removed",
                    description:
                        $"{previousStaffName} was removed from the request.",
                    createdAt: ticket.UpdatedAt.Value
                );

                if (notificationSettings.NotifyAssignment)
                {
                    AddNotifications(
                        ticket: ticket,
                        recipientUserIds: new int?[]
                        {
                            previousAssignedUserId
                        },
                        actorUserId: currentUserId,
                        type: "assignment",
                        title: "Request assignment removed",
                        message:
                            $"Request #{ticket.Id} \"{ticket.Title}\" is no longer assigned to you.",
                        createdAt: ticket.UpdatedAt.Value
                    );

                    AddNotifications(
                        ticket: ticket,
                        recipientUserIds: new int?[]
                        {
                            ticket.CreatedByUserId
                        },
                        actorUserId: currentUserId,
                        type: "assignment",
                        title: "Staff assignment removed",
                        message:
                            $"{previousStaffName} was removed from request #{ticket.Id} \"{ticket.Title}\".",
                        createdAt: ticket.UpdatedAt.Value
                    );
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Request assignment was removed.",
                ticketId = ticket.Id,
                assignedToUserId = ticket.AssignedToUserId,
                assignedToUserName = (string?)null,
                assignedToName = (string?)null
            });
        }

        var assignedUserId =
            assignTicketDto.AssignedToUserId.Value;

        var assignedUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user =>
                user.Id == assignedUserId
            );

        if (assignedUser == null)
        {
            return BadRequest(new
            {
                message = "The selected user could not be found."
            });
        }

        var assignedUserRole = assignedUser.Role
            .Trim()
            .ToLowerInvariant();

        if (assignedUserRole != "staff")
        {
            return BadRequest(new
            {
                message = "Requests can only be assigned to staff users."
            });
        }

        ticket.AssignedToUserId = assignedUser.Id;
        ticket.UpdatedAt = DateTime.UtcNow;

        if (previousAssignedUserId != assignedUser.Id)
        {
            var previousStaffName =
                previousAssignedUser?.FullName ??
                (
                    previousAssignedUserId.HasValue
                        ? $"User #{previousAssignedUserId.Value}"
                        : null
                );

            var activityDescription =
                previousAssignedUserId.HasValue
                    ? $"{previousStaffName} was changed to {assignedUser.FullName}."
                    : $"{assignedUser.FullName} was assigned to the request.";

            AddActivity(
                ticket: ticket,
                actorUserId: currentUserId,
                actorName: currentUser.FullName,
                actorRole: currentUser.Role,
                type: "assignment",
                title:
                    previousAssignedUserId.HasValue
                        ? "Staff assignment changed"
                        : "Staff assigned",
                description: activityDescription,
                createdAt: ticket.UpdatedAt.Value
            );

            if (notificationSettings.NotifyAssignment)
            {
                AddNotifications(
                    ticket: ticket,
                    recipientUserIds: new int?[]
                    {
                        assignedUser.Id
                    },
                    actorUserId: currentUserId,
                    type: "assignment",
                    title: "Request assigned to you",
                    message:
                        $"Request #{ticket.Id} \"{ticket.Title}\" has been assigned to you.",
                    createdAt: ticket.UpdatedAt.Value
                );

                AddNotifications(
                    ticket: ticket,
                    recipientUserIds: new int?[]
                    {
                        ticket.CreatedByUserId
                    },
                    actorUserId: currentUserId,
                    type: "assignment",
                    title: "Staff assigned to your request",
                    message:
                        $"{assignedUser.FullName} was assigned to request #{ticket.Id} \"{ticket.Title}\".",
                    createdAt: ticket.UpdatedAt.Value
                );

                if (
                    previousAssignedUserId.HasValue &&
                    previousAssignedUserId.Value != assignedUser.Id
                )
                {
                    AddNotifications(
                        ticket: ticket,
                        recipientUserIds: new int?[]
                        {
                            previousAssignedUserId
                        },
                        actorUserId: currentUserId,
                        type: "assignment",
                        title: "Request assignment changed",
                        message:
                            $"Request #{ticket.Id} \"{ticket.Title}\" is no longer assigned to you.",
                        createdAt: ticket.UpdatedAt.Value
                    );
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Request assigned successfully.",
            ticketId = ticket.Id,
            assignedToUserId = assignedUser.Id,
            assignedToUserName = assignedUser.FullName,
            assignedToName = assignedUser.FullName
        });
    }

    [Authorize(Policy = "ManagementOnly")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTicket(int id)
    {
        var ticket = await _context.Tickets
            .FindAsync(id);

        if (ticket == null)
        {
            return NotFound(new
            {
                message = "Request could not be found."
            });
        }

        _context.Tickets.Remove(ticket);

        await _context.SaveChangesAsync();

        return NoContent();
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