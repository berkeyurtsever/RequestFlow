using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using RequestFlow.Api.Data;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Tests;

public sealed class RequestFlowWebApplicationFactory :
    WebApplicationFactory<Program>
{
    private const string TestJwtKey =
        "requestflow-integration-tests-secret-key-2026";

    private const string TestJwtIssuer = "RequestFlow.Tests";
    private const string TestJwtAudience = "RequestFlow.Tests.Client";

    private readonly SqliteConnection _connection =
        new("Data Source=:memory:");

    private readonly IReadOnlyDictionary<string, string?>
        _configurationOverrides;

    private readonly SemaphoreSlim
        _databaseInitializationLock = new(1, 1);

    private bool _databaseInitialized;

    public RequestFlowWebApplicationFactory()
        : this(null)
    {
    }

    internal RequestFlowWebApplicationFactory(
        IReadOnlyDictionary<string, string?>?
            configurationOverrides)
    {
        _configurationOverrides =
            configurationOverrides ??
            new Dictionary<string, string?>();
    }

    protected override void ConfigureWebHost(
        IWebHostBuilder builder
    )
    {
        _connection.Open();

        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            var configurationValues =
                new Dictionary<string, string?>
                {
                    ["Jwt:Key"] =
                        TestJwtKey,
                    ["Jwt:Issuer"] = TestJwtIssuer,
                    ["Jwt:Audience"] = TestJwtAudience,
                    ["Jwt:ExpirationMinutes"] = "30",
                    ["Frontend:BaseUrl"] =
                        "https://requestflow.test"
                };

            foreach (var configurationOverride in
                     _configurationOverrides)
            {
                configurationValues[
                    configurationOverride.Key
                ] = configurationOverride.Value;
            }

            configuration.AddInMemoryCollection(
                configurationValues
            );
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<TestEmailSender>();
            services.AddSingleton<IEmailSender>(
                serviceProvider =>
                    serviceProvider
                        .GetRequiredService<
                            TestEmailSender
                        >()
            );

            services.PostConfigure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme,
                options =>
                {
                    options.TokenValidationParameters =
                        new TokenValidationParameters
                        {
                            ValidateIssuer = true,
                            ValidIssuer = TestJwtIssuer,
                            ValidateAudience = true,
                            ValidAudience = TestJwtAudience,
                            ValidateIssuerSigningKey = true,
                            IssuerSigningKey =
                                new SymmetricSecurityKey(
                                    Encoding.UTF8.GetBytes(TestJwtKey)
                                ),
                            ValidateLifetime = true,
                            ClockSkew = TimeSpan.Zero,
                            NameClaimType = "name",
                            RoleClaimType = "role"
                        };
                }
            );
        });
    }

    public async Task InitializeDatabaseAsync()
    {
        await _databaseInitializationLock.WaitAsync();

        try
        {
            if (_databaseInitialized)
            {
                return;
            }

            using var scope = Services.CreateScope();

            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            await context.Database.EnsureCreatedAsync();
            await CategorySeeder.SeedAsync(context);
            await RequestContentSeeder.SeedAsync(context);
            _databaseInitialized = true;
        }
        finally
        {
            _databaseInitializationLock.Release();
        }
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _databaseInitializationLock.Dispose();
            _connection.Dispose();
        }
    }
}
