using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Services;

public sealed class SlaMonitoringWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SlaMonitoringWorker> _logger;

    public SlaMonitoringWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<SlaMonitoringWorker> logger
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken
    )
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckBreachesAsync(stoppingToken);
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "SLA deadlines could not be checked."
                );
            }

            await Task.Delay(
                TimeSpan.FromMinutes(2),
                stoppingToken
            );
        }
    }

    public async Task<int> CheckBreachesAsync(
        CancellationToken cancellationToken = default
    )
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;
        var tickets = await context.Tickets
            .Where(ticket =>
                ticket.SlaDueAt.HasValue &&
                ticket.SlaDueAt.Value <= now &&
                !ticket.SlaBreachedAt.HasValue &&
                ticket.Status != "Resolved" &&
                ticket.Status != "Rejected" &&
                ticket.Status != "Completed"
            )
            .ToListAsync(cancellationToken);

        foreach (var ticket in tickets)
        {
            ticket.SlaBreachedAt = now;

            var recipients = new[]
            {
                ticket.CreatedByUserId,
                ticket.AssignedToUserId
            }
            .Where(userId => userId.HasValue)
            .Select(userId => userId!.Value)
            .Distinct();

            foreach (var userId in recipients)
            {
                context.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Ticket = ticket,
                    Type = "sla",
                    Title = "Request SLA deadline exceeded",
                    Message = $"Request #{ticket.Id} \"{ticket.Title}\" is overdue and needs attention.",
                    CreatedAt = now
                });
            }

            context.AuditLogs.Add(new AuditLog
            {
                ActorName = "RequestFlow",
                ActorRole = "System",
                Action = "sla.breached",
                EntityType = "Ticket",
                EntityId = ticket.Id.ToString(),
                Summary = $"Request #{ticket.Id} exceeded its SLA deadline.",
                CreatedAt = now
            });
        }

        if (tickets.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }

        return tickets.Count;
    }
}
