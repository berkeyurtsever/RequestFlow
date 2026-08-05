using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ManagementOnly")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetReports()
    {
        var tickets = await _context.Tickets
            .AsNoTracking()
            .OrderByDescending(ticket => ticket.CreatedAt)
            .ToListAsync();

        var totalRequests = tickets.Count;

        var openRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Open",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var inProgressRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "In Progress",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var pendingRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Pending",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var completedRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Resolved",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var rejectedRequests = tickets.Count(ticket =>
            ticket.Status.Equals(
                "Rejected",
                StringComparison.OrdinalIgnoreCase
            )
        );

        var statusData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Status)
                    ? "Unknown"
                    : ticket.Status.Trim()
            )
            .Select(group => new
            {
                name = group.Key,
                value = group.Count()
            })
            .OrderByDescending(item => item.value)
            .ToList();

        var categoryData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Category)
                    ? "Uncategorized"
                    : ticket.Category.Trim()
            )
            .Select(group => new
            {
                name = group.Key,
                requests = group.Count()
            })
            .OrderByDescending(item => item.requests)
            .ToList();

        var priorityData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Priority)
                    ? "Unknown"
                    : ticket.Priority.Trim()
            )
            .Select(group => new
            {
                name = group.Key,
                value = group.Count()
            })
            .OrderByDescending(item => item.value)
            .ToList();

        var recentRequests = tickets
            .Take(5)
            .Select(ticket => new
            {
                ticket.Id,
                ticket.Title,
                ticket.Category,
                ticket.Status,
                ticket.Priority,
                ticket.CreatedAt
            })
            .ToList();

        var resolvedTickets = tickets
            .Where(ticket =>
                ticket.Status.Equals(
                    "Resolved",
                    StringComparison.OrdinalIgnoreCase
                ) &&
                ticket.UpdatedAt.HasValue
            )
            .ToList();

        var averageResolutionHours =
            resolvedTickets.Count == 0
                ? 0
                : Math.Round(
                    resolvedTickets.Average(ticket =>
                        (
                            ticket.UpdatedAt!.Value -
                            ticket.CreatedAt
                        ).TotalHours
                    ),
                    1
                );

        var result = new
        {
            totalRequests,
            openRequests,
            inProgressRequests,
            pendingRequests,
            completedRequests,
            rejectedRequests,
            averageResolutionHours,
            statusData,
            categoryData,
            priorityData,
            recentRequests
        };

        return Ok(result);
    }
}