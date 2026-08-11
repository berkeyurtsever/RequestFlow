using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RequestFlow.Api.Data;
using RequestFlow.Api.Models;

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy"
}));

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();

    var context = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    await context.Database.MigrateAsync();
    await CategorySeeder.SeedAsync(context);
}

await app.RunAsync();

public partial class Program;
