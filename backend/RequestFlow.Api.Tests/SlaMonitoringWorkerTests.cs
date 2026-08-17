using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RequestFlow.Api.Data;
using RequestFlow.Api.Services;
using Xunit;

namespace RequestFlow.Api.Tests;

public sealed class SlaMonitoringWorkerTests
{
    [Fact]
    public async Task StopAsync_CompletesWithoutCancellationFailure()
    {
        await using var connection = new SqliteConnection(
            "Data Source=:memory:"
        );
        await connection.OpenAsync();

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(connection)
        );

        await using var provider = services.BuildServiceProvider();

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();
            await context.Database.EnsureCreatedAsync();
        }

        var worker = new SlaMonitoringWorker(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<SlaMonitoringWorker>.Instance
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
}
