using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Route("api/Users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly string[] AllowedRoles =
    {
        "User",
        "Staff",
        "Supervisor",
        "Admin"
    };

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .AsNoTracking()
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.Role,
                user.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [Authorize(Policy = "ManagementOnly")]
    [HttpGet("staff")]
    public async Task<IActionResult> GetStaffUsers()
    {
        var staffUsers = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.Role.ToLower() == "staff"
            )
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.Role,
                user.CreatedAt
            })
            .ToListAsync();

        return Ok(staffUsers);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPatch("{id:int}/role")]
    public async Task<IActionResult> UpdateUserRole(
        int id,
        [FromBody] UpdateUserRoleDto updateUserRoleDto
    )
    {
        var currentUserIdValue =
            User.FindFirst("sub")?.Value ??
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        if (!int.TryParse(
                currentUserIdValue,
                out var currentUserId
            ))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        if (currentUserId == id)
        {
            return BadRequest(new
            {
                message =
                    "You cannot change your own account role."
            });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(user =>
                user.Id == id
            );

        if (user == null)
        {
            return NotFound(new
            {
                message = "User could not be found."
            });
        }

        var normalizedRole = NormalizeRole(
            updateUserRoleDto.Role
        );

        if (normalizedRole == null)
        {
            return BadRequest(new
            {
                message =
                    "Role must be User, Staff, Supervisor or Admin."
            });
        }

        if (user.Role.Equals(
                normalizedRole,
                StringComparison.OrdinalIgnoreCase
            ))
        {
            return Ok(new
            {
                message =
                    "The user already has the selected role.",
                user = new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Role
                }
            });
        }

        user.Role = normalizedRole;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "User role updated successfully.",
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.Role
            }
        });
    }

    private static string? NormalizeRole(
        string role
    )
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        return AllowedRoles.FirstOrDefault(
            allowedRole =>
                allowedRole.Equals(
                    role.Trim(),
                    StringComparison.OrdinalIgnoreCase
                )
        );
    }
}