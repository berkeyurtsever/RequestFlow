namespace RequestFlow.Api.Services;

public interface IEmailSender
{
    bool IsConfigured { get; }

    Task SendPasswordResetAsync(
        string recipientName,
        string recipientEmail,
        string resetUrl,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default
    );
}
