using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/Tickets")]
[Authorize]
public partial class TicketsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<TicketsController> _logger;

    public TicketsController(
        AppDbContext context,
        IWebHostEnvironment environment,
        ILogger<TicketsController> logger
    )
    {
        _context = context;
        _environment = environment;
        _logger = logger;
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
}
