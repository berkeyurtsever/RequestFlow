using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RequestFlow.Api.Data;
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
    }
}
