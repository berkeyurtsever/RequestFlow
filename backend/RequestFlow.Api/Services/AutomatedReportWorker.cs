using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;

namespace RequestFlow.Api.Services;

public sealed class AutomatedReportWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AutomatedReportWorker> _logger;

    public AutomatedReportWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<AutomatedReportWorker> logger
    )
    {
        _scopeFactory = scopeFactory;
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
                    await ProcessDueAsync(stoppingToken);
                }
                catch (Exception exception) when (
                    exception is not OperationCanceledException ||
                    !stoppingToken.IsCancellationRequested
                )
                {
                    _logger.LogError(
                        exception,
                        "The scheduled report could not be processed."
                    );
                }

                await Task.Delay(
                    TimeSpan.FromMinutes(15),
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

    public async Task ProcessDueAsync(
        CancellationToken cancellationToken = default
    )
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();
        var schedule = await context.ReportSchedules
            .OrderBy(item => item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (
            schedule == null ||
            !schedule.Enabled ||
            !schedule.NextRunAtUtc.HasValue ||
            schedule.NextRunAtUtc.Value > DateTime.UtcNow
        )
        {
            return;
        }

        var emailEnabled = await context.SystemSettings
            .AsNoTracking()
            .Select(settings => (bool?)settings.EmailNotifications)
            .FirstOrDefaultAsync(cancellationToken) ?? true;

        if (!emailEnabled)
        {
            schedule.LastDeliveryStatus = "Email notifications disabled";
            schedule.LastError =
                "System email notifications are currently disabled.";
            await context.SaveChangesAsync(cancellationToken);
            return;
        }

        var reportEmailService = scope.ServiceProvider
            .GetRequiredService<IReportEmailService>();

        try
        {
            var result = await reportEmailService.SendAsync(
                schedule,
                cancellationToken
            );

            schedule.LastDeliveryStatus = result.Status;
            schedule.LastError = result.Error;

            if (result.Sent)
            {
                schedule.LastSentAtUtc = DateTime.UtcNow;
                schedule.NextRunAtUtc =
                    ReportScheduleRules.CalculateNextRunUtc(
                        schedule.Frequency
                    );
            }
        }
        catch (Exception exception)
        {
            schedule.LastDeliveryStatus = "Failed";
            schedule.LastError = exception.Message[..Math.Min(
                exception.Message.Length,
                500
            )];
            _logger.LogWarning(
                exception,
                "The scheduled report email could not be sent."
            );
        }

        schedule.UpdatedAtUtc = DateTime.UtcNow;
        await context.SaveChangesAsync(cancellationToken);
    }
}
