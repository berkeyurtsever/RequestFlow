using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;
using Xunit;

namespace RequestFlow.Api.Tests;

public sealed class SlaMonitoringWorkerTests
{
    [Fact]
    public async Task StopAsync_CompletesWithoutCancellationFailure()
    {
        const string connectionString =
            "Data Source=SlaWorkerTests;Mode=Memory;Cache=Shared";
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

            context.Tickets.Add(new Ticket
            {
                Title = "SLA shutdown test",
                Description = "Confirms the worker completed its first cycle.",
                Category = "General Request",
                Priority = "High",
                Status = "Open",
                SlaDueAt = DateTime.UtcNow.AddMinutes(-1)
            });
            await context.SaveChangesAsync();
        }

        var worker = new SlaMonitoringWorker(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<SlaMonitoringWorker>.Instance
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
            cycleCompleted = await context.Tickets
                .AsNoTracking()
                .AnyAsync(ticket => ticket.SlaBreachedAt.HasValue);
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
}
