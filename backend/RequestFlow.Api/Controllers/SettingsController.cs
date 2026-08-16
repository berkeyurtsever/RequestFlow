using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Settings;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private static readonly string[] AllowedPriorities =
    {
        "Low",
        "Medium",
        "High",
        "Urgent"
    };

    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLog;

    public SettingsController(
        AppDbContext context,
        IAuditLogService auditLog
    )
    {
        _context = context;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<ActionResult<SystemSettingDto>>
        GetSettings()
    {
        var settings =
            await GetOrCreateSettingsAsync();

        var response =
            await CreateResponseAsync(
                settings
            );

        return Ok(response);
    }

    [HttpPut]
    public async Task<ActionResult<SystemSettingDto>>
        UpdateSettings(
            [FromBody] UpdateSystemSettingDto request
        )
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var systemName =
            request.SystemName?.Trim() ??
            string.Empty;

        var systemDescription =
            request.SystemDescription?.Trim() ??
            string.Empty;

        if (systemName.Length < 3)
        {
            return BadRequest(new
            {
                message =
                    "System name must contain at least 3 characters."
            });
        }

        if (systemName.Length > 50)
        {
            return BadRequest(new
            {
                message =
                    "System name cannot exceed 50 characters."
            });
        }

        if (systemDescription.Length < 3)
        {
            return BadRequest(new
            {
                message =
                    "System description must contain at least 3 characters."
            });
        }

        if (systemDescription.Length > 250)
        {
            return BadRequest(new
            {
                message =
                    "System description cannot exceed 250 characters."
            });
        }

        var normalizedPriority =
            NormalizePriority(
                request.DefaultPriority
            );

        if (normalizedPriority == null)
        {
            return BadRequest(new
            {
                message =
                    "Default priority must be Low, Medium, High or Urgent."
            });
        }

        var currentUserExists =
            await _context.Users
                .AsNoTracking()
                .AnyAsync(user =>
                    user.Id == currentUserId
                );

        if (!currentUserExists)
        {
            return Unauthorized(new
            {
                message =
                    "The authenticated user could not be found."
            });
        }

        var settings =
            await GetOrCreateSettingsAsync();

        settings.SystemName =
            systemName;

        settings.SystemDescription =
            systemDescription;

        settings.DefaultPriority =
            normalizedPriority;

        settings.AutoAssignment =
            request.AutoAssignment;

        settings.EmailNotifications =
            request.EmailNotifications;

        settings.NotifyNewRequest =
            request.NotifyNewRequest;

        settings.NotifyAssignment =
            request.NotifyAssignment;

        settings.NotifyStatusChange =
            request.NotifyStatusChange;

        settings.NotifyComments =
            request.NotifyComments;

        settings.UpdatedAt =
            DateTime.UtcNow;

        settings.UpdatedByUserId =
            currentUserId;

        _auditLog.Add(
            User,
            "settings.updated",
            "SystemSetting",
            settings.Id.ToString(),
            "System and notification settings were updated."
        );

        await _context.SaveChangesAsync();

        var response =
            await CreateResponseAsync(
                settings
            );

        return Ok(response);
    }

    [HttpPost("restore-defaults")]
    public async Task<ActionResult<SystemSettingDto>>
        RestoreDefaults()
    {
        if (!TryGetCurrentUserId(
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message =
                    "User session is invalid."
            });
        }

        var currentUserExists =
            await _context.Users
                .AsNoTracking()
                .AnyAsync(user =>
                    user.Id == currentUserId
                );

        if (!currentUserExists)
        {
            return Unauthorized(new
            {
                message =
                    "The authenticated user could not be found."
            });
        }

        var settings =
            await GetOrCreateSettingsAsync();

        ApplyDefaultValues(
            settings
        );

        settings.UpdatedAt =
            DateTime.UtcNow;

        settings.UpdatedByUserId =
            currentUserId;

        _auditLog.Add(
            User,
            "settings.restored",
            "SystemSetting",
            settings.Id.ToString(),
            "System settings were restored to defaults."
        );

        await _context.SaveChangesAsync();

        var response =
            await CreateResponseAsync(
                settings
            );

        return Ok(response);
    }

    private async Task<SystemSetting>
        GetOrCreateSettingsAsync()
    {
        var settings =
            await _context.SystemSettings
                .OrderBy(setting =>
                    setting.Id
                )
                .FirstOrDefaultAsync();

        if (settings != null)
        {
            return settings;
        }

        settings =
            new SystemSetting
            {
                Id = 1,
                UpdatedAt =
                    DateTime.UtcNow
            };

        ApplyDefaultValues(
            settings
        );

        _context.SystemSettings.Add(
            settings
        );

        await _context.SaveChangesAsync();

        return settings;
    }

    private async Task<SystemSettingDto>
        CreateResponseAsync(
            SystemSetting settings
        )
    {
        string? updatedByUserName =
            null;

        if (
            settings.UpdatedByUserId
                .HasValue
        )
        {
            updatedByUserName =
                await _context.Users
                    .AsNoTracking()
                    .Where(user =>
                        user.Id ==
                        settings
                            .UpdatedByUserId
                            .Value
                    )
                    .Select(user =>
                        user.FullName
                    )
                    .FirstOrDefaultAsync();
        }

        return new SystemSettingDto
        {
            Id = settings.Id,

            SystemName =
                settings.SystemName,

            SystemDescription =
                settings.SystemDescription,

            DefaultPriority =
                settings.DefaultPriority,

            AutoAssignment =
                settings.AutoAssignment,

            EmailNotifications =
                settings.EmailNotifications,

            NotifyNewRequest =
                settings.NotifyNewRequest,

            NotifyAssignment =
                settings.NotifyAssignment,

            NotifyStatusChange =
                settings.NotifyStatusChange,

            NotifyComments =
                settings.NotifyComments,

            UpdatedAt =
                settings.UpdatedAt,

            UpdatedByUserId =
                settings.UpdatedByUserId,

            UpdatedByUserName =
                updatedByUserName
        };
    }

    private static void ApplyDefaultValues(
        SystemSetting settings
    )
    {
        settings.SystemName =
            "RequestFlow";

        settings.SystemDescription =
            "Company request tracking and workflow management system.";

        settings.DefaultPriority =
            "Medium";

        settings.AutoAssignment =
            false;

        settings.EmailNotifications =
            true;

        settings.NotifyNewRequest =
            true;

        settings.NotifyAssignment =
            true;

        settings.NotifyStatusChange =
            true;

        settings.NotifyComments =
            true;
    }

    private static string?
        NormalizePriority(
            string? priority
        )
    {
        var selectedPriority =
            AllowedPriorities
                .FirstOrDefault(
                    allowedPriority =>
                        allowedPriority.Equals(
                            priority?.Trim(),
                            StringComparison
                                .OrdinalIgnoreCase
                        )
                );

        return selectedPriority;
    }

    private bool TryGetCurrentUserId(
        out int currentUserId
    )
    {
        var claimValue =
            User.FindFirst("sub")?.Value ??
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        return int.TryParse(
            claimValue,
            out currentUserId
        );
    }
}
