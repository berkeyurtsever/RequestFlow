using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Activities;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/Tickets/{ticketId:int}/activities")]
public class TicketActivitiesController : ControllerBase
{
    private readonly AppDbContext _context;

    public TicketActivitiesController(
        AppDbContext context
    )
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<TicketActivityDto>>>
        GetActivities(int ticketId)
    {
        var currentUserId = GetCurrentUserId();

        if (currentUserId == null)
        {
            return Unauthorized(
                new
                {
                    message =
                        "The authenticated user could not be identified."
                }
            );
        }

        var currentRole = GetCurrentUserRole();

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(
                ticket => ticket.Id == ticketId
            );

        if (ticket == null)
        {
            return NotFound(
                new
                {
                    message = "Ticket not found."
                }
            );
        }

        if (!CanAccessTicket(
                ticket,
                currentUserId.Value,
                currentRole
            ))
        {
            return Forbid();
        }

        var activities = await _context
            .TicketActivities
            .AsNoTracking()
            .Where(
                activity =>
                    activity.TicketId == ticketId
            )
            .OrderByDescending(
                activity => activity.CreatedAt
            )
            .Select(
                activity =>
                    new TicketActivityDto
                    {
                        Id = activity.Id,
                        TicketId =
                            activity.TicketId,
                        ActorUserId =
                            activity.ActorUserId,
                        ActorName =
                            activity.ActorName,
                        ActorRole =
                            activity.ActorRole,
                        Type = activity.Type,
                        Title =
                            activity.Title,
                        Description =
                            activity.Description,
                        CreatedAt =
                            activity.CreatedAt
                    }
            )
            .ToListAsync();

        return Ok(activities);
    }

    private int? GetCurrentUserId()
    {
        var value =
            User.FindFirstValue("sub");

        return int.TryParse(
            value,
            out var userId
        )
            ? userId
            : null;
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirstValue("role") ??
               string.Empty;
    }

    private static bool IsManagement(
        string role
    )
    {
        return role.Equals(
                   "Admin",
                   StringComparison.OrdinalIgnoreCase
               ) ||
               role.Equals(
                   "Supervisor",
                   StringComparison.OrdinalIgnoreCase
               );
    }

    private static bool CanAccessTicket(
        Ticket ticket,
        int currentUserId,
        string currentRole
    )
    {
        if (IsManagement(currentRole))
        {
            return true;
        }

        if (currentRole.Equals(
                "Staff",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            return ticket.AssignedToUserId ==
                   currentUserId;
        }

        if (currentRole.Equals(
                "User",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            return ticket.CreatedByUserId ==
                   currentUserId;
        }

        return false;
    }
}