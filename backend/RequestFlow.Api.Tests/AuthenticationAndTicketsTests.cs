using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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

    private void UseBearerToken(string token)
    {
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }
}
