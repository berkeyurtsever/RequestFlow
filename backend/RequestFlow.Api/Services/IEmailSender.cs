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

    Task SendNotificationAsync(
        string recipientName,
        string recipientEmail,
        string subject,
        string message,
        string actionUrl,
        CancellationToken cancellationToken = default
    );

    Task SendReportAsync(
        IReadOnlyCollection<string> recipientEmails,
        string subject,
        string message,
        byte[] pdfContent,
        string fileName,
        CancellationToken cancellationToken = default
    );
}
