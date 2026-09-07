using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RequestFlow.Api.Data;
using RequestFlow.Api.Options;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/system-health")]
public sealed class SystemHealthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly EmailOptions _emailOptions;
    private readonly IConfiguration _configuration;

    public SystemHealthController(
        AppDbContext context,
        IWebHostEnvironment environment,
        IOptions<EmailOptions> emailOptions,
        IConfiguration configuration
    )
    {
        _context = context;
        _environment = environment;
        _emailOptions = emailOptions.Value;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetSystemHealth(
        CancellationToken cancellationToken
    )
    {
        var checkedAt = DateTimeOffset.UtcNow;
        var databaseTimer = Stopwatch.StartNew();
        var databaseAvailable = false;

        try
        {
            databaseAvailable = await _context.Database
                .CanConnectAsync(cancellationToken);
        }
        catch (Exception exception) when (
            exception is not OperationCanceledException
        )
        {
            databaseAvailable = false;
        }

        databaseTimer.Stop();

        var summary = new
        {
            users = 0,
            requests = 0,
            openRequests = 0,
            overdueRequests = 0,
            unreadNotifications = 0
        };

        if (databaseAvailable)
        {
            var now = checkedAt.UtcDateTime;
            var users = await _context.Users
                .AsNoTracking()
                .CountAsync(cancellationToken);
            var requests = await _context.Tickets
                .AsNoTracking()
                .CountAsync(cancellationToken);
            var openRequests = await _context.Tickets
                .AsNoTracking()
                .CountAsync(
                    ticket =>
                        ticket.Status != "Resolved" &&
                        ticket.Status != "Rejected",
                    cancellationToken
                );
            var overdueRequests = await _context.Tickets
                .AsNoTracking()
                .CountAsync(
                    ticket =>
                        ticket.SlaDueAt != null &&
                        ticket.SlaDueAt < now &&
                        ticket.Status != "Resolved" &&
                        ticket.Status != "Rejected",
                    cancellationToken
                );
            var unreadNotifications =
                await _context.Notifications
                    .AsNoTracking()
                    .CountAsync(
                        notification =>
                            !notification.IsRead,
                        cancellationToken
                    );

            summary = new
            {
                users,
                requests,
                openRequests,
                overdueRequests,
                unreadNotifications
            };
        }

        var emailConfigured =
            _emailOptions.Enabled &&
            !string.IsNullOrWhiteSpace(
                _emailOptions.Host
            ) &&
            !string.IsNullOrWhiteSpace(
                _emailOptions.FromAddress
            );

        var monitoringConfigured =
            !string.IsNullOrWhiteSpace(
                _configuration["Sentry:Dsn"] ??
                _configuration["SENTRY_DSN"]
            );

        var components = new object[]
        {
            new
            {
                key = "api",
                status = "healthy",
                detailKey = "operational",
                responseTimeMs = 0L
            },
            new
            {
                key = "database",
                status = databaseAvailable
                    ? "healthy"
                    : "degraded",
                detailKey = databaseAvailable
                    ? "connected"
                    : "databaseUnavailable",
                responseTimeMs = databaseTimer.ElapsedMilliseconds
            },
            new
            {
                key = "email",
                status = emailConfigured
                    ? "healthy"
                    : "disabled",
                detailKey = emailConfigured
                    ? "emailEnabled"
                    : "emailDisabled",
                responseTimeMs = (long?)null
            },
            new
            {
                key = "realtime",
                status = "healthy",
                detailKey = "realtime",
                responseTimeMs = (long?)null
            },
            new
            {
                key = "monitoring",
                status = monitoringConfigured
                    ? "configured"
                    : "disabled",
                detailKey = monitoringConfigured
                    ? "monitoringEnabled"
                    : "monitoringDisabled",
                responseTimeMs = (long?)null
            },
            new
            {
                key = "background",
                status = _environment.IsEnvironment("Testing")
                    ? "disabled"
                    : "configured",
                detailKey = _environment.IsEnvironment("Testing")
                    ? "workersDisabled"
                    : "workers",
                responseTimeMs = (long?)null
            }
        };

        return Ok(new
        {
            status = databaseAvailable
                ? "healthy"
                : "degraded",
            checkedAt,
            uptimeSeconds = Math.Max(
                0,
                Environment.TickCount64 / 1000
            ),
            environment = _environment.EnvironmentName,
            version = typeof(Program)
                .Assembly
                .GetName()
                .Version?
                .ToString(3) ?? "1.0.0",
            resources = new
            {
                workingSetMegabytes = Math.Round(
                    Environment.WorkingSet /
                    1024d /
                    1024d,
                    1
                ),
                managedMemoryMegabytes = Math.Round(
                    GC.GetTotalMemory(false) /
                    1024d /
                    1024d,
                    1
                ),
                processorCount =
                    Environment.ProcessorCount
            },
            summary,
            components
        });
    }
}
