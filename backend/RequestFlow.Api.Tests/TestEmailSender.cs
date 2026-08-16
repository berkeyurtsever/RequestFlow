using System.Collections.Concurrent;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Tests;

public sealed record SentPasswordResetEmail(
    string RecipientEmail,
    string ResetUrl,
    DateTime ExpiresAtUtc
);

public sealed record SentNotificationEmail(
    string RecipientEmail,
    string Subject,
    string ActionUrl
);

public sealed class TestEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<
        SentPasswordResetEmail
    > _messages = new();

    private readonly ConcurrentQueue<
        SentNotificationEmail
    > _notificationMessages = new();

    public bool IsConfigured => true;

    public IReadOnlyCollection<
        SentPasswordResetEmail
    > Messages => _messages.ToArray();

    public IReadOnlyCollection<SentNotificationEmail>
        NotificationMessages =>
        _notificationMessages.ToArray();

    public Task SendPasswordResetAsync(
        string recipientName,
        string recipientEmail,
        string resetUrl,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default
    )
    {
        _messages.Enqueue(
            new SentPasswordResetEmail(
                recipientEmail,
                resetUrl,
                expiresAtUtc
            )
        );

        return Task.CompletedTask;
    }

    public Task SendNotificationAsync(
        string recipientName,
        string recipientEmail,
        string subject,
        string message,
        string actionUrl,
        CancellationToken cancellationToken = default
    )
    {
        _notificationMessages.Enqueue(
            new SentNotificationEmail(
                recipientEmail,
                subject,
                actionUrl
            )
        );

        return Task.CompletedTask;
    }
}
