using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Services;

public sealed class NotificationEmailWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationEmailWorker> _logger;

    public NotificationEmailWorker(
        IServiceScopeFactory scopeFactory,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<NotificationEmailWorker> logger
    )
    {
        _scopeFactory = scopeFactory;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken
    )
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingAsync(stoppingToken);
                }
                catch (Exception exception) when (
                    exception is not OperationCanceledException ||
                    !stoppingToken.IsCancellationRequested
                )
                {
                    _logger.LogError(
                        exception,
                        "Pending notification emails could not be processed."
                    );
                }

                await Task.Delay(
                    TimeSpan.FromSeconds(15),
                    stoppingToken
                );
            }
        }
        catch (OperationCanceledException) when (
            stoppingToken.IsCancellationRequested
        )
        {
        }
    }

    public async Task ProcessPendingAsync(
        CancellationToken cancellationToken = default
    )
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var pending = await context.Notifications
            .Include(notification => notification.User)
            .Where(notification =>
                notification.EmailDeliveryStatus == "Pending"
            )
            .OrderBy(notification => notification.Id)
            .Take(25)
            .ToListAsync(cancellationToken);

        if (pending.Count == 0)
        {
            return;
        }

        var globalEmailEnabled = await context.SystemSettings
            .AsNoTracking()
            .Select(settings => (bool?)settings.EmailNotifications)
            .FirstOrDefaultAsync(cancellationToken) ?? true;

        var demoMode = _configuration.GetValue<bool>(
            "Demo:Enabled"
        );

        foreach (var notification in pending)
        {
            var preference = await context.UserNotificationPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    item => item.UserId == notification.UserId,
                    cancellationToken
                );

            if (
                !globalEmailEnabled ||
                demoMode ||
                !_emailSender.IsConfigured ||
                notification.User == null ||
                !ShouldSend(notification.Type, preference)
            )
            {
                notification.EmailDeliveryStatus = "Skipped";
                continue;
            }

            try
            {
                var frontendBaseUrl = (
                    _configuration["Frontend:BaseUrl"] ??
                    "http://localhost:5173"
                ).TrimEnd('/');

                var actionUrl = notification.TicketId.HasValue
                    ? $"{frontendBaseUrl}/requests/edit/{notification.TicketId.Value}"
                    : $"{frontendBaseUrl}/notifications";

                await _emailSender.SendNotificationAsync(
                    notification.User.FullName,
                    notification.User.Email,
                    notification.Title,
                    notification.Message,
                    actionUrl,
                    cancellationToken
                );

                notification.EmailDeliveryStatus = "Sent";
                notification.EmailDeliveredAt = DateTime.UtcNow;
            }
            catch (Exception exception)
            {
                notification.EmailDeliveryStatus = "Failed";
                _logger.LogWarning(
                    exception,
                    "Notification email {NotificationId} could not be delivered.",
                    notification.Id
                );
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static bool ShouldSend(
        string? type,
        Models.UserNotificationPreference? preference
    )
    {
        if (preference?.EmailEnabled == false)
        {
            return false;
        }

        return type?.Trim().ToLowerInvariant() switch
        {
            "assignment" or "unassignment" =>
                preference?.NotifyAssignment ?? true,
            "status" =>
                preference?.NotifyStatusChange ?? true,
            "comment" =>
                preference?.NotifyComments ?? true,
            "sla" =>
                preference?.NotifySla ?? true,
            _ => true
        };
    }
}
