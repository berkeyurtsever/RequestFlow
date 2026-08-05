using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AuthController(
        AppDbContext context,
        IConfiguration configuration,
        IPasswordHasher<User> passwordHasher
    )
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(
        RegisterDto registerDto
    )
    {
        var fullName = registerDto.FullName.Trim();

        var normalizedEmail = registerDto.Email
            .Trim()
            .ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(fullName))
        {
            return BadRequest(new
            {
                message = "Full name is required."
            });
        }

        var emailExists = await _context.Users.AnyAsync(
            user => user.Email == normalizedEmail
        );

        if (emailExists)
        {
            return Conflict(new
            {
                message = "An account with this email already exists."
            });
        }

        var user = new User
        {
            FullName = fullName,
            Email = normalizedEmail,
            Role = "User",
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _passwordHasher.HashPassword(
            user,
            registerDto.Password
        );

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return StatusCode(
            StatusCodes.Status201Created,
            CreateAuthResponse(user)
        );
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(
        LoginDto loginDto
    )
    {
        var normalizedEmail = loginDto.Email
            .Trim()
            .ToLowerInvariant();

        var user = await _context.Users.SingleOrDefaultAsync(
            databaseUser =>
                databaseUser.Email == normalizedEmail
        );

        if (user == null)
        {
            return Unauthorized(new
            {
                message = "Email or password is incorrect."
            });
        }

        var passwordResult =
            _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                loginDto.Password
            );

        if (passwordResult ==
            PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                message = "Email or password is incorrect."
            });
        }

        if (passwordResult ==
            PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash =
                _passwordHasher.HashPassword(
                    user,
                    loginDto.Password
                );

            await _context.SaveChangesAsync();
        }

        return Ok(CreateAuthResponse(user));
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        ForgotPasswordDto forgotPasswordDto
    )
    {
        var normalizedEmail = forgotPasswordDto.Email
            .Trim()
            .ToLowerInvariant();

        var userExists = await _context.Users.AnyAsync(
            user => user.Email == normalizedEmail
        );

        if (userExists)
        {
            Console.WriteLine(
                $"Password reset requested for: {normalizedEmail}"
            );
        }

        return Ok(new
        {
            message =
                "If an account exists with this email, password reset instructions will be sent."
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordDto changePasswordDto
    )
    {
        var userIdValue = User.FindFirst("sub")?.Value;

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new
            {
                message = "User session is invalid."
            });
        }

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return Unauthorized(new
            {
                message = "User account could not be found."
            });
        }

        var currentPasswordResult =
            _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                changePasswordDto.CurrentPassword
            );

        if (currentPasswordResult ==
            PasswordVerificationResult.Failed)
        {
            return BadRequest(new
            {
                message = "Current password is incorrect."
            });
        }

        if (changePasswordDto.NewPassword !=
            changePasswordDto.ConfirmPassword)
        {
            return BadRequest(new
            {
                message = "New passwords do not match."
            });
        }

        var samePasswordResult =
            _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                changePasswordDto.NewPassword
            );

        if (samePasswordResult !=
            PasswordVerificationResult.Failed)
        {
            return BadRequest(new
            {
                message =
                    "New password must be different from the current password."
            });
        }

        user.PasswordHash =
            _passwordHasher.HashPassword(
                user,
                changePasswordDto.NewPassword
            );

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Password changed successfully."
        });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        return Ok(new
        {
            userId = User.FindFirst("sub")?.Value,
            fullName = User.FindFirst("name")?.Value,
            email = User.FindFirst("email")?.Value,
            role = User.FindFirst("role")?.Value
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin-test")]
    public IActionResult AdminTest()
    {
        return Ok(new
        {
            message = "Admin authorization is working.",
            user = User.FindFirst("name")?.Value,
            role = User.FindFirst("role")?.Value
        });
    }

    [Authorize]
    [HttpGet("claims")]
    public IActionResult GetClaims()
    {
        var claims = User.Claims.Select(claim => new
        {
            type = claim.Type,
            value = claim.Value
        });

        return Ok(claims);
    }

    [Authorize]
    [HttpGet("debug-auth")]
    public async Task<IActionResult> DebugAuth()
    {
        var email =
            User.FindFirst("email")?.Value ??
            User.FindFirst(ClaimTypes.Email)?.Value;

        var tokenRole =
            User.FindFirst("role")?.Value ??
            User.FindFirst(ClaimTypes.Role)?.Value;

        RequestFlow.Api.Models.User? databaseUser = null;

        if (!string.IsNullOrWhiteSpace(email))
        {
            databaseUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    user => user.Email == email
                );
        }

        return Ok(new
        {
            isAuthenticated =
                User.Identity?.IsAuthenticated,

            authenticationType =
                User.Identity?.AuthenticationType,

            identityName =
                User.Identity?.Name,

            email,

            tokenRole,

            databaseRole =
                databaseUser?.Role,

            isInAdminRole =
                User.IsInRole("Admin"),

            claims = User.Claims.Select(claim => new
            {
                type = claim.Type,
                value = claim.Value
            })
        });
    }

    private AuthResponseDto CreateAuthResponse(User user)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "JWT key was not found."
            );

        var jwtIssuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "JWT issuer was not found."
            );

        var jwtAudience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "JWT audience was not found."
            );

        var expirationMinutes =
            _configuration.GetValue<int>(
                "Jwt:ExpirationMinutes"
            );

        if (expirationMinutes <= 0)
        {
            expirationMinutes = 120;
        }

        var now = DateTime.UtcNow;

        var expiresAt = now.AddMinutes(
            expirationMinutes
        );

        var role = NormalizeRole(user.Role);

        var claims = new List<Claim>
        {
            new(
                JwtRegisteredClaimNames.Sub,
                user.Id.ToString()
            ),
            new(
                "name",
                user.FullName
            ),
            new(
                "email",
                user.Email
            ),
            new(
                "role",
                role
            ),
            new(
                JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(now)
                    .ToUnixTimeSeconds()
                    .ToString(),
                ClaimValueTypes.Integer64
            ),
            new(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString()
            )
        };

        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        );

        var signingCredentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256
        );

        var jwtToken = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            notBefore: now,
            expires: expiresAt,
            signingCredentials: signingCredentials
        );

        var tokenValue = new JwtSecurityTokenHandler()
            .WriteToken(jwtToken);

        return new AuthResponseDto
        {
            Token = tokenValue,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = role,
            ExpiresAt = expiresAt
        };
    }

    private static string NormalizeRole(string? role)
    {
        return role?.Trim().ToLowerInvariant() switch
        {
            "admin" => "Admin",
            "supervisor" => "Supervisor",
            "staff" => "Staff",
            _ => "User"
        };
    }
}