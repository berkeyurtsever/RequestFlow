using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Reports;

namespace RequestFlow.Api.Services;

public interface IReportDataService
{
    Task<ReportDto> GetAsync(
        string? period,
        CancellationToken cancellationToken = default
    );
}

public sealed class ReportDataService : IReportDataService
{
    private readonly AppDbContext _context;

    public ReportDataService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReportDto> GetAsync(
        string? period,
        CancellationToken cancellationToken = default
    )
    {
        var range = ReportPeriodResolver.Resolve(period);
        var query = _context.Tickets.AsNoTracking();

        if (range.FromUtc.HasValue)
        {
            query = query.Where(ticket =>
                ticket.CreatedAt >= range.FromUtc.Value
            );
        }

        var tickets = await query
            .Where(ticket => ticket.CreatedAt <= range.ToUtc)
            .OrderByDescending(ticket => ticket.UpdatedAt ?? ticket.CreatedAt)
            .ToListAsync(cancellationToken);

        var totalRequests = tickets.Count;
        var now = range.ToUtc;
        var resolvedTickets = tickets
            .Where(ticket =>
                ticket.Status.Equals(
                    "Resolved",
                    StringComparison.OrdinalIgnoreCase
                ) &&
                ticket.UpdatedAt.HasValue
            )
            .ToList();

        var categoryData = tickets
            .GroupBy(ticket =>
                string.IsNullOrWhiteSpace(ticket.Category)
                    ? "Uncategorized"
                    : ticket.Category.Trim()
            )
            .Select(group =>
            {
                var requests = group.Count();
                var percentage = totalRequests == 0
                    ? 0
                    : Math.Round(
                        requests * 100d / totalRequests,
                        1
                    );

                return new ReportCategoryDto
                {
                    Name = group.Key,
                    Requests = requests,
                    Percentage = percentage,
                    Intensity = GetIntensity(percentage)
                };
            })
            .OrderByDescending(item => item.Requests)
            .ThenBy(item => item.Name)
            .ToList();

        return new ReportDto
        {
            Period = range.Key,
            PeriodLabel = range.Label,
            FromUtc = range.FromUtc,
            ToUtc = range.ToUtc,
            TotalRequests = totalRequests,
            OpenRequests = CountStatus(tickets, "Open"),
            InProgressRequests = CountStatus(tickets, "In Progress"),
            PendingRequests = CountStatus(tickets, "Pending"),
            CompletedRequests = CountStatus(tickets, "Resolved"),
            RejectedRequests = CountStatus(tickets, "Rejected"),
            OverdueRequests = tickets.Count(ticket =>
                !SlaPolicy.IsClosed(ticket.Status) &&
                ticket.SlaDueAt.HasValue &&
                ticket.SlaDueAt.Value <= now
            ),
            DueSoonRequests = tickets.Count(ticket =>
                !SlaPolicy.IsClosed(ticket.Status) &&
                ticket.SlaDueAt.HasValue &&
                ticket.SlaDueAt.Value > now &&
                ticket.SlaDueAt.Value <= now.AddHours(8)
            ),
            AverageResolutionHours = resolvedTickets.Count == 0
                ? 0
                : Math.Round(
                    resolvedTickets.Average(ticket =>
                        (
                            ticket.UpdatedAt!.Value -
                            ticket.CreatedAt
                        ).TotalHours
                    ),
                    1
                ),
            StatusData = tickets
                .GroupBy(ticket => Normalize(ticket.Status, "Unknown"))
                .Select(group => new ReportStatusDto
                {
                    Name = group.Key,
                    Value = group.Count()
                })
                .OrderByDescending(item => item.Value)
                .ToList(),
            CategoryData = categoryData,
            PriorityData = tickets
                .GroupBy(ticket => Normalize(ticket.Priority, "Unknown"))
                .Select(group => new ReportStatusDto
                {
                    Name = group.Key,
                    Value = group.Count()
                })
                .OrderByDescending(item => item.Value)
                .ToList(),
            RecentRequests = tickets
                .Take(20)
                .Select(ticket => new ReportRequestDto
                {
                    Id = ticket.Id,
                    Title = ticket.Title,
                    Category = ticket.Category,
                    Status = ticket.Status,
                    Priority = ticket.Priority,
                    CreatedAt = ticket.CreatedAt,
                    SlaDueAt = ticket.SlaDueAt,
                    SlaBreachedAt = ticket.SlaBreachedAt
                })
                .ToList()
        };
    }

    private static int CountStatus(
        IEnumerable<Models.Ticket> tickets,
        string status
    ) => tickets.Count(ticket =>
        ticket.Status.Equals(
            status,
            StringComparison.OrdinalIgnoreCase
        )
    );

    private static string Normalize(
        string? value,
        string fallback
    ) => string.IsNullOrWhiteSpace(value)
        ? fallback
        : value.Trim();

    private static string GetIntensity(double percentage)
    {
        if (percentage >= 40)
        {
            return "Very High";
        }

        if (percentage >= 25)
        {
            return "High";
        }

        if (percentage >= 10)
        {
            return "Medium";
        }

        return "Low";
    }
}
