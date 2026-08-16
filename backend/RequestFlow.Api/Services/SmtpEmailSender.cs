using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using Microsoft.Extensions.Options;
using RequestFlow.Api.Options;

namespace RequestFlow.Api.Services;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    public SmtpEmailSender(
        IOptions<EmailOptions> options
    )
    {
        _options = options.Value;
    }

    public bool IsConfigured =>
        _options.Enabled &&
        !string.IsNullOrWhiteSpace(_options.Host) &&
        _options.Port > 0 &&
        !string.IsNullOrWhiteSpace(
            _options.FromAddress
        );

    public async Task SendPasswordResetAsync(
        string recipientName,
        string recipientEmail,
        string resetUrl,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default
    )
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "Email delivery is not configured."
            );
        }

        var displayName =
            string.IsNullOrWhiteSpace(recipientName)
                ? "RequestFlow user"
                : recipientName.Trim();

        var safeName = WebUtility.HtmlEncode(
            displayName
        );

        var safeResetUrl = WebUtility.HtmlEncode(
            resetUrl
        );

        var expirationText = expiresAtUtc
            .ToUniversalTime()
            .ToString("yyyy-MM-dd HH:mm 'UTC'");

        using var message = new MailMessage
        {
            From = new MailAddress(
                _options.FromAddress,
                _options.FromName
            ),
            Subject = "Reset your RequestFlow password",
            Body = $"""
                Hello {displayName},

                A password reset was requested for your RequestFlow account.

                Open this secure link to choose a new password:
                {resetUrl}

                This single-use link expires at {expirationText}.
                If you did not request this change, you can ignore this email.
                """,
            IsBodyHtml = false
        };

        message.To.Add(
            new MailAddress(recipientEmail)
        );

        var htmlBody = $"""
            <p>Hello {safeName},</p>
            <p>A password reset was requested for your RequestFlow account.</p>
            <p><a href="{safeResetUrl}">Choose a new password</a></p>
            <p>This single-use link expires at <strong>{expirationText}</strong>.</p>
            <p>If you did not request this change, you can ignore this email.</p>
            """;

        message.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(
                htmlBody,
                null,
                MediaTypeNames.Text.Html
            )
        );

        using var smtpClient = new SmtpClient(
            _options.Host,
            _options.Port
        )
        {
            EnableSsl = _options.UseSsl,
            DeliveryMethod =
                SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false
        };

        if (!string.IsNullOrWhiteSpace(
                _options.Username
            ))
        {
            smtpClient.Credentials =
                new NetworkCredential(
                    _options.Username,
                    _options.Password
                );
        }

        await smtpClient.SendMailAsync(
            message,
            cancellationToken
        );
    }

    public async Task SendNotificationAsync(
        string recipientName,
        string recipientEmail,
        string subject,
        string message,
        string actionUrl,
        CancellationToken cancellationToken = default
    )
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "Email delivery is not configured."
            );
        }

        var displayName = string.IsNullOrWhiteSpace(recipientName)
            ? "RequestFlow user"
            : recipientName.Trim();

        using var mailMessage = new MailMessage
        {
            From = new MailAddress(
                _options.FromAddress,
                _options.FromName
            ),
            Subject = subject,
            Body = $"Hello {displayName},\n\n{message}\n\nOpen RequestFlow: {actionUrl}",
            IsBodyHtml = false
        };

        mailMessage.To.Add(new MailAddress(recipientEmail));

        var htmlBody = $"""
            <p>Hello {WebUtility.HtmlEncode(displayName)},</p>
            <p>{WebUtility.HtmlEncode(message)}</p>
            <p><a href="{WebUtility.HtmlEncode(actionUrl)}">Open RequestFlow</a></p>
            <p style="color:#64748b;font-size:12px">You can change these emails from your RequestFlow profile.</p>
            """;

        mailMessage.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(
                htmlBody,
                null,
                MediaTypeNames.Text.Html
            )
        );

        using var smtpClient = CreateSmtpClient();
        await smtpClient.SendMailAsync(
            mailMessage,
            cancellationToken
        );
    }

    private SmtpClient CreateSmtpClient()
    {
        var smtpClient = new SmtpClient(
            _options.Host,
            _options.Port
        )
        {
            EnableSsl = _options.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false
        };

        if (!string.IsNullOrWhiteSpace(_options.Username))
        {
            smtpClient.Credentials = new NetworkCredential(
                _options.Username,
                _options.Password
            );
        }

        return smtpClient;
    }
}
