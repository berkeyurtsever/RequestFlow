using Microsoft.AspNetCore.SignalR;
using RequestFlow.Api.Hubs;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Services;

public interface INotificationPublisher
{
    Task PublishAsync(
        Notification notification,
        CancellationToken cancellationToken = default
    );
}

public sealed class NotificationPublisher :
    INotificationPublisher
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<NotificationPublisher> _logger;

    public NotificationPublisher(
        IHubContext<NotificationHub> hub,
        ILogger<NotificationPublisher> logger
    )
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task PublishAsync(
        Notification notification,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            await _hub.Clients
                .Group($"user:{notification.UserId}")
                .SendAsync(
                    "notificationReceived",
                    new
                    {
                        notification.Id,
                        notification.UserId,
                        notification.TicketId,
                        notification.Type,
                        notification.Title,
                        notification.Message,
                        notification.IsRead,
                        notification.CreatedAt
                    },
                    cancellationToken
                );
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Realtime notification {NotificationId} could not be published.",
                notification.Id
            );
        }
    }
}
