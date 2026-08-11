using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;
using RequestFlow.Api.Options;
using RequestFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddScoped<
    IPasswordHasher<User>,
    PasswordHasher<User>
>();

builder.Services
    .AddOptions<EmailOptions>()
    .Bind(
        builder.Configuration.GetSection(
            EmailOptions.SectionName
        )
    )
    .Validate(
        options =>
            !options.Enabled ||
            (
                !string.IsNullOrWhiteSpace(
                    options.Host
                ) &&
                options.Port > 0 &&
                !string.IsNullOrWhiteSpace(
                    options.FromAddress
                )
            ),
        "Enabled email delivery requires a host, port and sender address."
    )
    .ValidateOnStart();

builder.Services.AddSingleton<
    IEmailSender,
    SmtpEmailSender
>();

var connectionString =
    builder.Configuration.GetConnectionString(
        "DefaultConnection"
    ) ?? "Data Source=requestflow.db";

builder.Services.AddDbContext<AppDbContext>(
    options =>
    {
        options.UseSqlite(connectionString);
    }
);

var allowedOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ??
    ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "FrontendPolicy",
        policy =>
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    );
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;

    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter =
        PartitionedRateLimiter.Create<
            HttpContext,
            string
        >(context =>
        {
            var partitionKey =
                context.Connection
                    .RemoteIpAddress
                    ?.ToString() ??
                "unknown";

            return RateLimitPartition
                .GetFixedWindowLimiter(
                    partitionKey,
                    _ =>
                        new FixedWindowRateLimiterOptions
                        {
                            AutoReplenishment = true,
                            PermitLimit = 180,
                            QueueLimit = 0,
                            Window =
                                TimeSpan.FromMinutes(1)
                        }
                );
        });

    options.AddPolicy(
        "authentication",
        context =>
        {
            var partitionKey =
                context.Connection
                    .RemoteIpAddress
                    ?.ToString() ??
                "unknown";

            return RateLimitPartition
                .GetFixedWindowLimiter(
                    partitionKey,
                    _ =>
                        new FixedWindowRateLimiterOptions
                        {
                            AutoReplenishment = true,
                            PermitLimit = 20,
                            QueueLimit = 0,
                            Window =
                                TimeSpan.FromMinutes(1)
                        }
                );
        }
    );
});

var jwtSection =
    builder.Configuration.GetSection("Jwt");

var jwtKey =
    jwtSection["Key"] ??
    throw new InvalidOperationException(
        "JWT Key is missing from appsettings.json."
    );

var normalizedJwtKey = jwtKey.Trim();
var usesUnsafeJwtKey =
    normalizedJwtKey.Length < 32 ||
    normalizedJwtKey.StartsWith(
        "CHANGE_ME",
        StringComparison.OrdinalIgnoreCase
    ) ||
    normalizedJwtKey.Contains(
        "CHANGE-THIS",
        StringComparison.OrdinalIgnoreCase
    ) ||
    normalizedJwtKey.Contains(
        "REPLACE-WITH",
        StringComparison.OrdinalIgnoreCase
    );

if (
    builder.Environment.IsProduction() &&
    usesUnsafeJwtKey
)
{
    throw new InvalidOperationException(
        "Set Jwt__Key to a unique secret of at least 32 characters before starting in Production."
    );
}

var jwtIssuer =
    jwtSection["Issuer"] ??
    throw new InvalidOperationException(
        "JWT Issuer is missing from appsettings.json."
    );

var jwtAudience =
    jwtSection["Audience"] ??
    throw new InvalidOperationException(
        "JWT Audience is missing from appsettings.json."
    );

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,

                ValidateAudience = true,
                ValidAudience = jwtAudience,

                ValidateIssuerSigningKey = true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey
                        )
                    ),

                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,

                NameClaimType = "name",
                RoleClaimType = "role"
            };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userIdValue = context.Principal?
                    .FindFirst("sub")?.Value;

                var securityVersionValue =
                    context.Principal?
                        .FindFirst(
                            "security_version"
                        )?.Value;

                if (
                    !int.TryParse(
                        userIdValue,
                        out var userId
                    ) ||
                    !int.TryParse(
                        securityVersionValue,
                        out var tokenSecurityVersion
                    )
                )
                {
                    context.Fail(
                        "The session security version is invalid."
                    );
                    return;
                }

                var database = context.HttpContext
                    .RequestServices
                    .GetRequiredService<AppDbContext>();

                var currentSecurityVersion =
                    await database.Users
                        .AsNoTracking()
                        .Where(user =>
                            user.Id == userId
                        )
                        .Select(user =>
                            (int?)user.SecurityVersion
                        )
                        .SingleOrDefaultAsync(
                            context.HttpContext
                                .RequestAborted
                        );

                if (
                    currentSecurityVersion is null ||
                    currentSecurityVersion.Value !=
                    tokenSecurityVersion
                )
                {
                    context.Fail(
                        "The session is no longer valid."
                    );
                }
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        "AdminOnly",
        policy =>
        {
            policy.RequireRole("Admin");
        }
    );

    options.AddPolicy(
        "ManagementOnly",
        policy =>
        {
            policy.RequireRole(
                "Admin",
                "Supervisor"
            );
        }
    );
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,

            Description =
                "Enter the JWT token obtained from the login endpoint."
        }
    );

    options.AddSecurityRequirement(
        document =>
            new OpenApiSecurityRequirement
            {
                [
                    new OpenApiSecuritySchemeReference(
                        "Bearer",
                        document
                    )
                ] = []
            }
    );
});

var app = builder.Build();

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy"
}));

var frontendIndexPath = Path.Combine(
    app.Environment.WebRootPath ?? string.Empty,
    "index.html"
);

if (File.Exists(frontendIndexPath))
{
    app.MapFallbackToFile("index.html");
}

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();

    var context = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    await context.Database.MigrateAsync();
    await CategorySeeder.SeedAsync(context);

    if (builder.Configuration.GetValue<bool>(
            "Demo:Enabled"
        ))
    {
        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher<User>>();

        var supervisorEmail =
            builder.Configuration[
                "Demo:SupervisorEmail"
            ] ??
            DemoDataSeeder.DefaultSupervisorEmail;

        await DemoDataSeeder.SeedAsync(
            context,
            passwordHasher,
            supervisorEmail
        );
    }
}

await app.RunAsync();

public partial class Program;
