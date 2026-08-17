using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private static readonly string[] DefaultCards =
    {
        "periodSummary",
        "requestSummary",
        "serviceMetrics",
        "statusDistribution",
        "recentRequests",
        "priorityDistribution",
        "topCategories",
        "quickActions",
        "teamWorkload"
    };

    private static readonly HashSet<string> PersonnelRoles =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Admin",
            "Supervisor",
            "Staff"
        };

    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<DashboardAnalyticsDto>> GetAnalytics(
        [FromQuery] int days = 7
    )
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        days = days is 7 or 30 or 90 ? days : 7;
        var role = GetRole();
        var isManagement = IsManagement(role);
        var rangeStart = DateTime.UtcNow.Date.AddDays(-(days - 1));

        IQueryable<Ticket> ticketQuery = _context.Tickets
            .AsNoTracking()
            .Include(ticket => ticket.AssignedToUser)
            .Include(ticket => ticket.Comments)
            .Include(ticket => ticket.Activities);

        if (role.Equals("staff", StringComparison.OrdinalIgnoreCase))
        {
            ticketQuery = ticketQuery.Where(ticket =>
                ticket.AssignedToUserId == userId
            );
        }
        else if (!isManagement)
        {
            ticketQuery = ticketQuery.Where(ticket =>
                ticket.CreatedByUserId == userId
            );
        }

        var tickets = await ticketQuery.ToListAsync();

        var firstResponseHours = tickets
            .Where(ticket => ticket.CreatedAt >= rangeStart)
            .Select(ticket => new
            {
                Ticket = ticket,
                RespondedAt = GetFirstResponseAt(ticket)
            })
            .Where(item => item.RespondedAt.HasValue)
            .Select(item => Math.Max(
                0,
                (item.RespondedAt!.Value - item.Ticket.CreatedAt)
                    .TotalHours
            ))
            .ToList();

        var resolutionRecords = tickets
            .Where(ticket => IsClosed(ticket.Status))
            .Select(ticket => new
            {
                Ticket = ticket,
                ResolvedAt = GetResolvedAt(ticket)
            })
            .Where(item =>
                item.ResolvedAt.HasValue &&
                item.ResolvedAt.Value >= rangeStart
            )
            .ToList();

        var resolutionHours = resolutionRecords
            .Select(item => Math.Max(
                0,
                (item.ResolvedAt!.Value - item.Ticket.CreatedAt)
                    .TotalHours
            ))
            .ToList();

        var slaRecords = resolutionRecords
            .Where(item => item.Ticket.SlaDueAt.HasValue)
            .ToList();

        var slaMetCount = slaRecords.Count(item =>
            item.ResolvedAt!.Value <= item.Ticket.SlaDueAt!.Value
        );

        var result = new DashboardAnalyticsDto
        {
            Days = days,
            AverageFirstResponseHours = AverageOrNull(firstResponseHours),
            FirstResponseSampleSize = firstResponseHours.Count,
            AverageResolutionHours = AverageOrNull(resolutionHours),
            ResolutionSampleSize = resolutionHours.Count,
            SlaEvaluatedCount = slaRecords.Count,
            SlaMetCount = slaMetCount,
            SlaBreachedCount = slaRecords.Count - slaMetCount,
            SlaSuccessRate = slaRecords.Count == 0
                ? null
                : Math.Round(
                    slaMetCount * 100d / slaRecords.Count,
                    1
                )
        };

        if (isManagement)
        {
            result.PersonnelWorkload = BuildPersonnelWorkload(
                tickets,
                rangeStart
            );
        }

        return Ok(result);
    }

    [HttpGet("preferences")]
    public async Task<ActionResult<DashboardPreferenceDto>> GetPreferences()
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var preference = await _context.UserDashboardPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId);

        return Ok(new DashboardPreferenceDto
        {
            VisibleCards = ParseVisibleCards(
                preference?.VisibleCardsJson
            )
        });
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<DashboardPreferenceDto>> UpdatePreferences(
        [FromBody] DashboardPreferenceDto request
    )
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var visibleCards = NormalizeVisibleCards(request.VisibleCards);

        if (visibleCards.Count == 0)
        {
            return BadRequest(new
            {
                message = "Select at least one dashboard card."
            });
        }

        var preference = await _context.UserDashboardPreferences
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (preference == null)
        {
            preference = new UserDashboardPreference
            {
                UserId = userId
            };
            _context.UserDashboardPreferences.Add(preference);
        }

        preference.VisibleCardsJson = JsonSerializer.Serialize(visibleCards);
        preference.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new DashboardPreferenceDto
        {
            VisibleCards = visibleCards
        });
    }

    private static List<PersonnelWorkloadDto> BuildPersonnelWorkload(
        IEnumerable<Ticket> tickets,
        DateTime rangeStart
    )
    {
        var now = DateTime.UtcNow;
        var items = tickets
            .Where(ticket => ticket.AssignedToUserId.HasValue)
            .GroupBy(ticket => new
            {
                UserId = ticket.AssignedToUserId!.Value,
                Name = ticket.AssignedToUser?.FullName ??
                    $"User #{ticket.AssignedToUserId.Value}"
            })
            .Select(group =>
            {
                var active = group.Count(ticket => !IsClosed(ticket.Status));
                var resolved = group.Count(ticket =>
                    IsClosed(ticket.Status) &&
                    GetResolvedAt(ticket) >= rangeStart
                );
                var overdue = group.Count(ticket =>
                    !IsClosed(ticket.Status) &&
                    ticket.SlaDueAt.HasValue &&
                    ticket.SlaDueAt.Value < now
                );

                return new PersonnelWorkloadDto
                {
                    UserId = group.Key.UserId,
                    Name = group.Key.Name,
                    Active = active,
                    Resolved = resolved,
                    Overdue = overdue,
                    Total = active + resolved
                };
            })
            .OrderByDescending(item => item.Active)
            .ThenByDescending(item => item.Overdue)
            .ThenBy(item => item.Name)
            .Take(10)
            .ToList();

        var maximumActive = Math.Max(
            items.Select(item => item.Active).DefaultIfEmpty(0).Max(),
            1
        );

        foreach (var item in items)
        {
            item.UtilizationPercentage = (int)Math.Round(
                item.Active * 100d / maximumActive
            );
        }

        return items;
    }

    private static DateTime? GetFirstResponseAt(Ticket ticket)
    {
        var commentDates = ticket.Comments
            .Where(comment =>
                comment.AuthorUserId != ticket.CreatedByUserId &&
                PersonnelRoles.Contains(comment.AuthorRole)
            )
            .Select(comment => comment.CreatedAt);

        var activityDates = ticket.Activities
            .Where(activity =>
                activity.ActorUserId != ticket.CreatedByUserId &&
                PersonnelRoles.Contains(activity.ActorRole) &&
                !activity.Type.Equals("created", StringComparison.OrdinalIgnoreCase)
            )
            .Select(activity => activity.CreatedAt);

        return commentDates
            .Concat(activityDates)
            .Where(value => value >= ticket.CreatedAt)
            .OrderBy(value => value)
            .Select(value => (DateTime?)value)
            .FirstOrDefault();
    }

    private static DateTime? GetResolvedAt(Ticket ticket)
    {
        if (!IsClosed(ticket.Status))
        {
            return null;
        }

        var normalizedStatus = ticket.Status.Trim();
        var statusActivity = ticket.Activities
            .Where(activity =>
                activity.Type.Equals("status", StringComparison.OrdinalIgnoreCase) &&
                activity.Description.Contains(
                    $"to {normalizedStatus}",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            .OrderByDescending(activity => activity.CreatedAt)
            .FirstOrDefault();

        return statusActivity?.CreatedAt ??
            ticket.UpdatedAt ??
            ticket.CreatedAt;
    }

    private static double? AverageOrNull(IReadOnlyCollection<double> values)
    {
        return values.Count == 0
            ? null
            : Math.Round(values.Average(), 1);
    }

    private static bool IsClosed(string? status)
    {
        var normalized = status?.Trim().ToLowerInvariant();
        return normalized is "resolved" or "rejected" or "completed";
    }

    private bool TryGetUserId(out int userId)
    {
        var value = User.FindFirst("sub")?.Value ??
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(value, out userId);
    }

    private string GetRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ??
            User.FindFirst("role")?.Value ??
            "User";
    }

    private static bool IsManagement(string role)
    {
        return role.Equals("admin", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("supervisor", StringComparison.OrdinalIgnoreCase);
    }

    private static List<string> ParseVisibleCards(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return DefaultCards.ToList();
        }

        try
        {
            var values = JsonSerializer.Deserialize<List<string>>(json);
            var normalized = NormalizeVisibleCards(values);
            return normalized.Count == 0
                ? DefaultCards.ToList()
                : normalized;
        }
        catch (JsonException)
        {
            return DefaultCards.ToList();
        }
    }

    private static List<string> NormalizeVisibleCards(
        IEnumerable<string>? values
    )
    {
        var requested = new HashSet<string>(
            values ?? Array.Empty<string>(),
            StringComparer.OrdinalIgnoreCase
        );

        return DefaultCards
            .Where(requested.Contains)
            .ToList();
    }
}
