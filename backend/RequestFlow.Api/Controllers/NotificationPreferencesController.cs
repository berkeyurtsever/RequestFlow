using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notification-preferences")]
public sealed class NotificationPreferencesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public NotificationPreferencesController(
        AppDbContext context,
        IEmailSender emailSender,
        IConfiguration configuration
    )
    {
        _context = context;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    [HttpGet("delivery-status")]
    public IActionResult GetDeliveryStatus()
    {
        var demoMode = _configuration.GetValue<bool>(
            "Demo:Enabled"
        );

        return Ok(new
        {
            configured = _emailSender.IsConfigured && !demoMode,
            demoMode,
            message = demoMode
                ? "Email delivery is disabled in the public demo."
                : _emailSender.IsConfigured
                    ? "Email delivery is active."
                    : "Add SMTP secrets to the hosting environment to activate delivery."
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetPreferences()
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var preference = await _context.UserNotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId);

        return Ok(ToDto(preference));
    }

    [HttpPut]
    public async Task<IActionResult> UpdatePreferences(
        [FromBody] NotificationPreferenceDto request
    )
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var preference = await _context.UserNotificationPreferences
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (preference == null)
        {
            preference = new UserNotificationPreference
            {
                UserId = userId
            };
            _context.UserNotificationPreferences.Add(preference);
        }

        preference.EmailEnabled = request.EmailEnabled;
        preference.NotifyAssignment = request.NotifyAssignment;
        preference.NotifyStatusChange = request.NotifyStatusChange;
        preference.NotifyComments = request.NotifyComments;
        preference.NotifySla = request.NotifySla;
        preference.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(preference));
    }

    private bool TryGetUserId(out int userId)
    {
        var value = User.FindFirst("sub")?.Value ??
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(value, out userId);
    }

    private static NotificationPreferenceDto ToDto(
        UserNotificationPreference? preference
    )
    {
        return new NotificationPreferenceDto
        {
            EmailEnabled = preference?.EmailEnabled ?? true,
            NotifyAssignment = preference?.NotifyAssignment ?? true,
            NotifyStatusChange = preference?.NotifyStatusChange ?? true,
            NotifyComments = preference?.NotifyComments ?? true,
            NotifySla = preference?.NotifySla ?? true
        };
    }
}
