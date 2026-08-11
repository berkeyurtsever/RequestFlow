using System.Collections.Concurrent;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Tests;

public sealed record SentPasswordResetEmail(
    string RecipientEmail,
    string ResetUrl,
    DateTime ExpiresAtUtc
);

public sealed class TestEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<
        SentPasswordResetEmail
    > _messages = new();

    public bool IsConfigured => true;

    public IReadOnlyCollection<
        SentPasswordResetEmail
    > Messages => _messages.ToArray();

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
}
