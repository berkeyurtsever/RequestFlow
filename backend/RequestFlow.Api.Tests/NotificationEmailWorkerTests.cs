using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;
using Xunit;

namespace RequestFlow.Api.Tests;

public sealed class NotificationEmailWorkerTests
{
    [Fact]
    public async Task StopAsync_CompletesWithoutCancellationFailure()
    {
        const string connectionString =
            "Data Source=NotificationWorkerTests;Mode=Memory;Cache=Shared";
        await using var keepAliveConnection = new SqliteConnection(
            connectionString
        );
        await keepAliveConnection.OpenAsync();

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(connectionString)
        );

        await using var provider = services.BuildServiceProvider();

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();
            await context.Database.EnsureCreatedAsync();

            var user = new User
            {
                FullName = "Notification Worker Test",
                Email = "notification-worker@example.com",
                PasswordHash = "test-password-hash"
            };
            context.Users.Add(user);
            context.Notifications.Add(new Notification
            {
                User = user,
                Type = "status",
                Title = "Worker shutdown test",
                Message = "Confirms the worker completed its first cycle."
            });
            await context.SaveChangesAsync();
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection()
            .Build();
        var worker = new NotificationEmailWorker(
            provider.GetRequiredService<IServiceScopeFactory>(),
            new UnconfiguredEmailSender(),
            configuration,
            NullLogger<NotificationEmailWorker>.Instance
        );

        await worker.StartAsync(CancellationToken.None);

        var cycleCompleted = false;
        var deadline = DateTime.UtcNow.AddSeconds(5);

        while (!cycleCompleted && DateTime.UtcNow < deadline)
        {
            await Task.Delay(25);

            using var scope = provider.CreateScope();
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();
            cycleCompleted = await context.Notifications
                .AsNoTracking()
                .AnyAsync(notification =>
                    notification.EmailDeliveryStatus == "Skipped"
                );
        }

        Assert.True(cycleCompleted);
        await worker.StopAsync(CancellationToken.None);

        Assert.NotNull(worker.ExecuteTask);
        await worker.ExecuteTask;
        Assert.Equal(
            TaskStatus.RanToCompletion,
            worker.ExecuteTask.Status
        );
    }

    private sealed class UnconfiguredEmailSender : IEmailSender
    {
        public bool IsConfigured => false;

        public Task SendPasswordResetAsync(
            string recipientName,
            string recipientEmail,
            string resetUrl,
            DateTime expiresAtUtc,
            CancellationToken cancellationToken = default
        ) => Task.CompletedTask;

        public Task SendNotificationAsync(
            string recipientName,
            string recipientEmail,
            string subject,
            string message,
            string actionUrl,
            CancellationToken cancellationToken = default
        ) => Task.CompletedTask;

        public Task SendReportAsync(
            IReadOnlyCollection<string> recipientEmails,
            string subject,
            string message,
            byte[] pdfContent,
            string fileName,
            CancellationToken cancellationToken = default
        ) => Task.CompletedTask;
    }
}
