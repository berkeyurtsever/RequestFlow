using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

public partial class TicketsController
{
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

            _auditLog.Add(
                User,
                "ticket.unassigned",
                "Ticket",
                ticket.Id.ToString(),
                $"The staff assignment for request #{ticket.Id} was removed."
            );

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

        _auditLog.Add(
            User,
            "ticket.assigned",
            "Ticket",
            ticket.Id.ToString(),
            $"Request #{ticket.Id} was assigned to {assignedUser.FullName}."
        );

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

        try
        {
            _auditLog.Add(
                User,
                "ticket.deleted",
                "Ticket",
                ticket.Id.ToString(),
                $"Request #{ticket.Id} \"{ticket.Title}\" was deleted."
            );
            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(
                exception,
                "Request {TicketId} could not be deleted.",
                id
            );

            return Problem(
                title: "Request deletion failed.",
                detail:
                    "The request could not be deleted. Please try again.",
                statusCode:
                    StatusCodes.Status500InternalServerError
            );
        }

        var uploadDirectory = Path.Combine(
            _environment.ContentRootPath,
            "Uploads",
            "Tickets",
            id.ToString()
        );

        if (Directory.Exists(uploadDirectory))
        {
            try
            {
                Directory.Delete(
                    uploadDirectory,
                    recursive: true
                );
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "Files for deleted request {TicketId} could not be removed from {Path}.",
                    id,
                    uploadDirectory
                );
            }
        }

        return NoContent();
    }
}
