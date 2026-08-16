using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;
using Xunit;

namespace RequestFlow.Api.Tests;

public sealed class AuthenticationAndTicketsTests :
    IClassFixture<RequestFlowWebApplicationFactory>,
    IAsyncLifetime
{
    private readonly RequestFlowWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthenticationAndTicketsTests(
        RequestFlowWebApplicationFactory factory
    )
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() =>
        _factory.InitializeDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task HealthEndpoint_ReturnsHealthyStatus()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task DemoLogin_ReturnsSeededSupervisorToken()
    {
        using var demoFactory =
            new RequestFlowWebApplicationFactory(
                new Dictionary<string, string?>
                {
                    ["Demo:Enabled"] = "true",
                    ["Demo:SupervisorEmail"] =
                        DemoDataSeeder.DefaultSupervisorEmail
                }
            );

        await demoFactory.InitializeDatabaseAsync();

        using (var scope = demoFactory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            await context.Database.EnsureCreatedAsync();

            var passwordHasher = scope.ServiceProvider
                .GetRequiredService<IPasswordHasher<User>>();

            await DemoDataSeeder.SeedAsync(
                context,
                passwordHasher
            );
        }

        using var demoClient = demoFactory.CreateClient();

        var response = await demoClient.PostAsync(
            "/api/Auth/demo-login",
            content: null
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auth = await response.Content
            .ReadFromJsonAsync<AuthResponseDto>();

        Assert.NotNull(auth);
        Assert.Equal("Supervisor", auth.Role);
        Assert.Equal(
            DemoDataSeeder.DefaultSupervisorEmail,
            auth.Email
        );
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
    }

    [Fact]
    public async Task Register_CreatesUserAndRejectsDuplicateEmail()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var registration = new RegisterDto
        {
            FullName = "Test User",
            Email = email,
            Password = "SafePassword123!"
        };

        var firstResponse = await _client.PostAsJsonAsync(
            "/api/Auth/register",
            registration
        );

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var auth = await firstResponse.Content
            .ReadFromJsonAsync<AuthResponseDto>();

        Assert.NotNull(auth);
        Assert.Equal("User", auth.Role);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));

        var duplicateResponse = await _client.PostAsJsonAsync(
            "/api/Auth/register",
            registration
        );

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoints_EnforceAuthenticationAndRoles()
    {
        var unauthorizedResponse = await _client.GetAsync("/api/Auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, unauthorizedResponse.StatusCode);

        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var profileResponse = await _client.GetAsync("/api/Auth/me");
        var adminResponse = await _client.GetAsync("/api/Settings");

        Assert.Equal(HttpStatusCode.OK, profileResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, adminResponse.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedUser_CanCreateAndReadOwnTicket()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var ticket = new Ticket
        {
            Title = "Laptop access request",
            Description = "A test request created by the integration suite.",
            Category = "Information Technology",
            Priority = "High"
        };

        var createResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            ticket
        );

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var createdTicket = await createResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(createdTicket);
        Assert.True(createdTicket.Id > 0);
        Assert.Equal(auth.UserId, createdTicket.CreatedByUserId);
        Assert.Equal("Open", createdTicket.Status);

        var listResponse = await _client.GetAsync("/api/Tickets");
        var tickets = await listResponse.Content
            .ReadFromJsonAsync<List<Ticket>>();

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        Assert.Contains(tickets!, item => item.Id == createdTicket.Id);
    }

    [Fact]
    public async Task AuthenticatedUser_CanReadKnowledgeBaseAndTemplates()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var knowledgeResponse = await _client.GetAsync(
            "/api/KnowledgeBase"
        );
        var templateResponse = await _client.GetAsync(
            "/api/RequestTemplates"
        );
        var fieldResponse = await _client.GetAsync(
            "/api/CategoryFields?category=Hardware%20Request"
        );

        Assert.Equal(HttpStatusCode.OK, knowledgeResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, templateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, fieldResponse.StatusCode);

        var articles = await knowledgeResponse.Content
            .ReadFromJsonAsync<List<KnowledgeArticle>>();
        var templates = await templateResponse.Content
            .ReadFromJsonAsync<List<RequestTemplate>>();
        var fields = await fieldResponse.Content
            .ReadFromJsonAsync<List<JsonElement>>();

        Assert.NotEmpty(articles!);
        Assert.NotEmpty(templates!);
        Assert.Contains(fields!, field =>
            field.GetProperty("key").GetString() == "deviceType"
        );
    }

    [Fact]
    public async Task TicketCategoryFields_AreValidatedAndPersisted()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var invalidResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            new Ticket
            {
                Title = "New laptop request",
                Description = "A laptop is needed for the new employee.",
                Category = "Hardware Request",
                Priority = "High"
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);

        var ticket = new Ticket
        {
            Title = "New laptop request",
            Description = "A laptop is needed for the new employee.",
            Category = "Hardware Request",
            Priority = "High",
            CustomFields = new Dictionary<string, string>
            {
                ["deviceType"] = "Laptop",
                ["operatingSystem"] = "Standard company image",
                ["neededBy"] = "2026-09-01"
            }
        };

        var createResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            ticket
        );

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var createdTicket = await createResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(createdTicket);
        Assert.Equal(
            "Laptop",
            createdTicket.CustomFields["deviceType"]
        );
        Assert.Equal(
            "2026-09-01",
            createdTicket.CustomFields["neededBy"]
        );
    }

    [Fact]
    public async Task Admin_CanDeleteTicketWithRelatedNotifications()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            new Ticket
            {
                Title = "Request scheduled for deletion",
                Description = "This request verifies related record cleanup.",
                Category = "General Request",
                Priority = "Medium"
            }
        );

        createResponse.EnsureSuccessStatusCode();

        var ticket = await createResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(ticket);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            var user = await context.Users.FindAsync(auth.UserId);
            Assert.NotNull(user);

            user.Role = "Admin";

            context.Notifications.Add(new Notification
            {
                UserId = auth.UserId,
                TicketId = ticket.Id,
                Type = "update",
                Title = "Request updated",
                Message = "A notification connected to the request."
            });

            await context.SaveChangesAsync();
        }

        var loginResponse = await _client.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginDto
            {
                Email = auth.Email,
                Password = "SafePassword123!"
            }
        );

        loginResponse.EnsureSuccessStatusCode();

        var adminAuth = await loginResponse.Content
            .ReadFromJsonAsync<AuthResponseDto>();

        Assert.NotNull(adminAuth);
        UseBearerToken(adminAuth.Token);

        var deleteResponse = await _client.DeleteAsync(
            $"/api/Tickets/{ticket.Id}"
        );

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        using var verificationScope = _factory.Services.CreateScope();

        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        Assert.False(await verificationContext.Tickets.AnyAsync(
            item => item.Id == ticket.Id
        ));

        Assert.False(await verificationContext.Notifications.AnyAsync(
            notification => notification.TicketId == ticket.Id
        ));
    }

    [Fact]
    public async Task RegularUser_CannotDeleteTicket()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            new Ticket
            {
                Title = "Protected request",
                Description = "Regular users must not permanently delete requests.",
                Category = "General Request",
                Priority = "Medium"
            }
        );

        createResponse.EnsureSuccessStatusCode();

        var ticket = await createResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(ticket);

        var deleteResponse = await _client.DeleteAsync(
            $"/api/Tickets/{ticket.Id}"
        );

        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);

        using var scope = _factory.Services.CreateScope();

        var context = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        Assert.True(await context.Tickets.AnyAsync(
            item => item.Id == ticket.Id
        ));
    }

    [Fact]
    public async Task RegularUser_CannotReadOrUpdateAnotherUsersTicket()
    {
        var owner = await RegisterUserAsync();
        UseBearerToken(owner.Token);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            new Ticket
            {
                Title = "Owner-only request",
                Description = "Another regular user must not access this request.",
                Category = "Information Technology",
                Priority = "High"
            }
        );

        createResponse.EnsureSuccessStatusCode();

        var ticket = await createResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(ticket);

        var otherUser = await RegisterUserAsync();
        UseBearerToken(otherUser.Token);

        var readResponse = await _client.GetAsync(
            $"/api/Tickets/{ticket.Id}"
        );

        var updateResponse = await _client.PutAsJsonAsync(
            $"/api/Tickets/{ticket.Id}",
            new Ticket
            {
                Title = "Unauthorized update",
                Description = "This update must be rejected.",
                Category = "General Request",
                Priority = "Low",
                Status = "Resolved"
            }
        );

        Assert.Equal(HttpStatusCode.Forbidden, readResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
    }

    [Fact]
    public async Task RegularUser_UpdateKeepsManagementControlledStatus()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/Tickets",
            new Ticket
            {
                Title = "Status protected request",
                Description = "The owner may edit details but not workflow status.",
                Category = "General Request",
                Priority = "Medium"
            }
        );

        createResponse.EnsureSuccessStatusCode();

        var ticket = await createResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(ticket);

        var updateResponse = await _client.PutAsJsonAsync(
            $"/api/Tickets/{ticket.Id}",
            new Ticket
            {
                Title = "Updated request details",
                Description = "The details were changed by the request owner.",
                Category = "General Request",
                Priority = "Medium",
                Status = "Resolved"
            }
        );

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updatedTicket = await updateResponse.Content
            .ReadFromJsonAsync<Ticket>();

        Assert.NotNull(updatedTicket);
        Assert.Equal("Updated request details", updatedTicket.Title);
        Assert.Equal("Open", updatedTicket.Status);
    }

    [Fact]
    public async Task PasswordReset_UsesSingleUseTokenAndInvalidatesSessions()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var forgotResponse = await _client.PostAsJsonAsync(
            "/api/Auth/forgot-password",
            new ForgotPasswordDto
            {
                Email = auth.Email
            }
        );

        Assert.Equal(HttpStatusCode.OK, forgotResponse.StatusCode);

        var emailSender = _factory.Services
            .GetRequiredService<TestEmailSender>();

        var resetEmail = emailSender.Messages
            .Last(message =>
                message.RecipientEmail == auth.Email
            );

        var resetUri = new Uri(resetEmail.ResetUrl);
        var resetToken = QueryHelpers
            .ParseQuery(resetUri.Query)["token"]
            .ToString();

        Assert.False(string.IsNullOrWhiteSpace(resetToken));
        Assert.True(
            resetEmail.ExpiresAtUtc > DateTime.UtcNow
        );

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            var storedToken = await context
                .PasswordResetTokens
                .SingleAsync(token =>
                    token.UserId == auth.UserId &&
                    token.UsedAtUtc == null
                );

            Assert.NotEqual(resetToken, storedToken.TokenHash);
            Assert.Equal(64, storedToken.TokenHash.Length);
        }

        const string newPassword =
            "NewSafePassword456!";

        var resetResponse = await _client.PostAsJsonAsync(
            "/api/Auth/reset-password",
            new ResetPasswordDto
            {
                Token = resetToken,
                NewPassword = newPassword,
                ConfirmPassword = newPassword
            }
        );

        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var oldSessionResponse = await _client.GetAsync(
            "/api/Auth/me"
        );

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            oldSessionResponse.StatusCode
        );

        var oldPasswordLogin = await _client.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginDto
            {
                Email = auth.Email,
                Password = "SafePassword123!"
            }
        );

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            oldPasswordLogin.StatusCode
        );

        var newPasswordLogin = await _client.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginDto
            {
                Email = auth.Email,
                Password = newPassword
            }
        );

        Assert.Equal(
            HttpStatusCode.OK,
            newPasswordLogin.StatusCode
        );

        var reusedTokenResponse = await _client.PostAsJsonAsync(
            "/api/Auth/reset-password",
            new ResetPasswordDto
            {
                Token = resetToken,
                NewPassword = "AnotherSafePassword789!",
                ConfirmPassword =
                    "AnotherSafePassword789!"
            }
        );

        Assert.Equal(
            HttpStatusCode.BadRequest,
            reusedTokenResponse.StatusCode
        );
    }

    private async Task<AuthResponseDto> RegisterUserAsync()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/Auth/register",
            new RegisterDto
            {
                FullName = "Integration User",
                Email = $"integration-{Guid.NewGuid():N}@example.com",
                Password = "SafePassword123!"
            }
        );

        response.EnsureSuccessStatusCode();

        return (await response.Content
            .ReadFromJsonAsync<AuthResponseDto>())!;
    }

    [Fact]
    public async Task NotificationPreferences_CanBeUpdatedByCurrentUser()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var updateResponse = await _client.PutAsJsonAsync(
            "/api/notification-preferences",
            new NotificationPreferenceDto
            {
                EmailEnabled = true,
                NotifyAssignment = false,
                NotifyStatusChange = true,
                NotifyComments = false,
                NotifySla = true
            }
        );

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var preferences = await updateResponse.Content
            .ReadFromJsonAsync<NotificationPreferenceDto>();

        Assert.NotNull(preferences);
        Assert.False(preferences.NotifyAssignment);
        Assert.False(preferences.NotifyComments);
        Assert.True(preferences.NotifySla);
    }

    [Fact]
    public async Task DashboardPreferences_AreSavedForCurrentUser()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var requestedCards = new DashboardPreferenceDto
        {
            VisibleCards = new List<string>
            {
                "serviceMetrics",
                "recentRequests"
            }
        };

        var updateResponse = await _client.PutAsJsonAsync(
            "/api/dashboard/preferences",
            requestedCards
        );

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var getResponse = await _client.GetAsync(
            "/api/dashboard/preferences"
        );
        var preferences = await getResponse.Content
            .ReadFromJsonAsync<DashboardPreferenceDto>();

        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.NotNull(preferences);
        Assert.Equal(requestedCards.VisibleCards, preferences.VisibleCards);
    }

    [Fact]
    public async Task DashboardAnalytics_CalculatesResponseResolutionAndSla()
    {
        var auth = await RegisterAdminAsync();
        UseBearerToken(auth.Token);

        var createdAt = DateTime.UtcNow.AddHours(-12);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            var staff = new User
            {
                FullName = "Analytics Staff",
                Email = $"analytics-{Guid.NewGuid():N}@example.com",
                PasswordHash = "unused-in-test",
                Role = "Staff"
            };
            context.Users.Add(staff);
            await context.SaveChangesAsync();

            var ticket = new Ticket
            {
                Title = "Analytics request",
                Description = "Dashboard metric integration test.",
                Category = "Information Technology",
                Priority = "High",
                Status = "Resolved",
                CreatedByUserId = auth.UserId,
                AssignedToUserId = staff.Id,
                CreatedAt = createdAt,
                UpdatedAt = createdAt.AddHours(10),
                SlaDueAt = createdAt.AddHours(24)
            };
            context.Tickets.Add(ticket);

            context.TicketComments.Add(new TicketComment
            {
                Ticket = ticket,
                AuthorUserId = staff.Id,
                AuthorName = staff.FullName,
                AuthorRole = staff.Role,
                Content = "We are reviewing the request.",
                CreatedAt = createdAt.AddHours(2)
            });

            context.TicketActivities.Add(new TicketActivity
            {
                Ticket = ticket,
                ActorUserId = staff.Id,
                ActorName = staff.FullName,
                ActorRole = staff.Role,
                Type = "status",
                Title = "Status changed",
                Description = "Status changed from In Progress to Resolved.",
                CreatedAt = createdAt.AddHours(10)
            });

            await context.SaveChangesAsync();
        }

        var response = await _client.GetAsync(
            "/api/dashboard/analytics?days=7"
        );
        var analytics = await response.Content
            .ReadFromJsonAsync<DashboardAnalyticsDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(analytics);
        Assert.Equal(2, analytics.AverageFirstResponseHours);
        Assert.Equal(10, analytics.AverageResolutionHours);
        Assert.Equal(100, analytics.SlaSuccessRate);
        Assert.Contains(
            analytics.PersonnelWorkload,
            item => item.Name == "Analytics Staff" && item.Resolved == 1
        );
    }

    [Fact]
    public async Task CreatedTicket_ReceivesPriorityBasedSlaDeadline()
    {
        var auth = await RegisterUserAsync();
        UseBearerToken(auth.Token);

        var beforeCreate = DateTime.UtcNow;
        var response = await _client.PostAsJsonAsync(
            "/api/Tickets",
            new Ticket
            {
                Title = "Urgent SLA test",
                Description = "Verify that urgent requests receive a four hour SLA.",
                Category = "Information Technology",
                Priority = "Urgent"
            }
        );

        var ticket = await response.Content.ReadFromJsonAsync<Ticket>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(ticket?.SlaDueAt);
        Assert.InRange(
            ticket!.SlaDueAt!.Value,
            beforeCreate.AddHours(4),
            DateTime.UtcNow.AddHours(4).AddSeconds(2)
        );
    }

    [Fact]
    public async Task Admin_CanExportPdfAndReviewAuditLog()
    {
        var auth = await RegisterAdminAsync();
        UseBearerToken(auth.Token);

        var categoryResponse = await _client.PostAsJsonAsync(
            "/api/Categories",
            new CreateCategoryDto
            {
                Name = $"Audit {Guid.NewGuid():N}",
                Description = "Created by the integration suite."
            }
        );

        Assert.Equal(HttpStatusCode.Created, categoryResponse.StatusCode);

        var auditResponse = await _client.GetAsync("/api/audit-logs");
        var auditJson = await auditResponse.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);
        Assert.Contains("category.created", auditJson);

        var pdfResponse = await _client.GetAsync("/api/Reports/pdf");
        var pdf = await pdfResponse.Content.ReadAsByteArrayAsync();

        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);
        Assert.Equal("application/pdf", pdfResponse.Content.Headers.ContentType?.MediaType);
        Assert.True(pdf.Length > 1000);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(pdf, 0, 4));
    }

    private async Task<AuthResponseDto> RegisterAdminAsync()
    {
        const string password = "SafePassword123!";
        var auth = await RegisterUserAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();
            var user = await context.Users.SingleAsync(item =>
                item.Id == auth.UserId
            );
            user.Role = "Admin";
            await context.SaveChangesAsync();
        }

        var loginResponse = await _client.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginDto
            {
                Email = auth.Email,
                Password = password
            }
        );

        loginResponse.EnsureSuccessStatusCode();
        return (await loginResponse.Content
            .ReadFromJsonAsync<AuthResponseDto>())!;
    }

    private void UseBearerToken(string token)
    {
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }
}
