using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs;
using RequestFlow.Api.Models;
using RequestFlow.Api.Services;

namespace RequestFlow.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private const string ForgotPasswordResponse =
        "If an account exists with this email, password reset instructions will be sent.";

    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        IConfiguration configuration,
        IPasswordHasher<User> passwordHasher,
        IEmailSender emailSender,
        ILogger<AuthController> logger
    )
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
        _emailSender = emailSender;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    [EnableRateLimiting("authentication")]
    public async Task<ActionResult<AuthResponseDto>> Register(
        RegisterDto registerDto
    )
    {
        if (IsDemoMode())
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "Account registration is disabled in the public demo."
                }
            );
        }

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
    [EnableRateLimiting("authentication")]
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
    [HttpPost("demo-login")]
    [EnableRateLimiting("authentication")]
    public async Task<ActionResult<AuthResponseDto>> DemoLogin()
    {
        if (!IsDemoMode())
        {
            return NotFound(new
            {
                message = "The public demo is not enabled."
            });
        }

        var supervisorEmail =
            _configuration[
                "Demo:SupervisorEmail"
            ] ??
            DemoDataSeeder.DefaultSupervisorEmail;

        var normalizedEmail = supervisorEmail
            .Trim()
            .ToLowerInvariant();

        var user = await _context.Users
            .SingleOrDefaultAsync(databaseUser =>
                databaseUser.Email == normalizedEmail
            );

        if (user == null)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    message =
                        "The demo account is not ready yet. Please try again shortly."
                }
            );
        }

        return Ok(CreateAuthResponse(user));
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> ForgotPassword(
        ForgotPasswordDto forgotPasswordDto,
        CancellationToken cancellationToken
    )
    {
        var normalizedEmail = forgotPasswordDto.Email
            .Trim()
            .ToLowerInvariant();

        if (IsDemoMode())
        {
            return Ok(new
            {
                message = ForgotPasswordResponse
            });
        }

        var user = await _context.Users
            .SingleOrDefaultAsync(
                databaseUser =>
                    databaseUser.Email ==
                    normalizedEmail,
                cancellationToken
            );

        if (user == null)
        {
            return Ok(new
            {
                message = ForgotPasswordResponse
            });
        }

        if (!_emailSender.IsConfigured)
        {
            _logger.LogWarning(
                "Password reset email was not sent because email delivery is not configured."
            );

            return Ok(new
            {
                message = ForgotPasswordResponse
            });
        }

        var now = DateTime.UtcNow;
        var expirationMinutes = Math.Clamp(
            _configuration.GetValue<int>(
                "PasswordReset:ExpirationMinutes",
                30
            ),
            5,
            120
        );

        var retentionCutoff = now.AddDays(-1);

        await _context.PasswordResetTokens
            .Where(token =>
                token.UserId == user.Id &&
                (
                    token.ExpiresAtUtc <
                        retentionCutoff ||
                    (
                        token.UsedAtUtc != null &&
                        token.UsedAtUtc <
                            retentionCutoff
                    )
                )
            )
            .ExecuteDeleteAsync(cancellationToken);

        var previousTokens = await _context
            .PasswordResetTokens
            .Where(token =>
                token.UserId == user.Id &&
                token.UsedAtUtc == null
            )
            .ToListAsync(cancellationToken);

        foreach (var previousToken in previousTokens)
        {
            previousToken.UsedAtUtc = now;
        }

        var rawToken = WebEncoders.Base64UrlEncode(
            RandomNumberGenerator.GetBytes(32)
        );

        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = HashResetToken(rawToken),
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddMinutes(
                expirationMinutes
            )
        };

        _context.PasswordResetTokens.Add(resetToken);
        await _context.SaveChangesAsync(
            cancellationToken
        );

        try
        {
            await _emailSender.SendPasswordResetAsync(
                user.FullName,
                user.Email,
                BuildPasswordResetUrl(rawToken),
                resetToken.ExpiresAtUtc,
                cancellationToken
            );
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Password reset email delivery failed."
            );

            _context.PasswordResetTokens.Remove(
                resetToken
            );

            await _context.SaveChangesAsync(
                cancellationToken
            );
        }

        return Ok(new
        {
            message = ForgotPasswordResponse
        });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> ResetPassword(
        ResetPasswordDto resetPasswordDto,
        CancellationToken cancellationToken
    )
    {
        if (IsDemoMode())
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "Password resets are disabled in the public demo."
                }
            );
        }

        if (
            resetPasswordDto.NewPassword !=
            resetPasswordDto.ConfirmPassword
        )
        {
            return BadRequest(new
            {
                message = "New passwords do not match."
            });
        }

        var tokenHash = HashResetToken(
            resetPasswordDto.Token.Trim()
        );

        var now = DateTime.UtcNow;

        await using var transaction =
            await _context.Database
                .BeginTransactionAsync(
                    cancellationToken
                );

        var passwordResetToken = await _context
            .PasswordResetTokens
            .Include(token => token.User)
            .SingleOrDefaultAsync(
                token =>
                    token.TokenHash == tokenHash &&
                    token.UsedAtUtc == null &&
                    token.ExpiresAtUtc > now,
                cancellationToken
            );

        if (passwordResetToken == null)
        {
            return BadRequest(new
            {
                message =
                    "This password reset link is invalid or has expired. Request a new link."
            });
        }

        var samePasswordResult =
            _passwordHasher.VerifyHashedPassword(
                passwordResetToken.User,
                passwordResetToken.User.PasswordHash,
                resetPasswordDto.NewPassword
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

        var consumedTokenCount = await _context
            .PasswordResetTokens
            .Where(token =>
                token.Id == passwordResetToken.Id &&
                token.UsedAtUtc == null &&
                token.ExpiresAtUtc > now
            )
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(
                    token => token.UsedAtUtc,
                    now
                ),
                cancellationToken
            );

        if (consumedTokenCount != 1)
        {
            return BadRequest(new
            {
                message =
                    "This password reset link is invalid or has expired. Request a new link."
            });
        }

        passwordResetToken.User.PasswordHash =
            _passwordHasher.HashPassword(
                passwordResetToken.User,
                resetPasswordDto.NewPassword
            );

        passwordResetToken.User.SecurityVersion += 1;

        var otherActiveTokens = await _context
            .PasswordResetTokens
            .Where(token =>
                token.UserId ==
                    passwordResetToken.UserId &&
                token.Id != passwordResetToken.Id &&
                token.UsedAtUtc == null
            )
            .ToListAsync(cancellationToken);

        foreach (var otherToken in otherActiveTokens)
        {
            otherToken.UsedAtUtc = now;
        }

        await _context.SaveChangesAsync(
            cancellationToken
        );

        await transaction.CommitAsync(
            cancellationToken
        );

        return Ok(new
        {
            message =
                "Your password has been reset successfully. Sign in with your new password."
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordDto changePasswordDto
    )
    {
        if (IsDemoMode())
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "Password changes are disabled in the public demo."
                }
            );
        }

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

        user.SecurityVersion += 1;

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
                "security_version",
                user.SecurityVersion.ToString()
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

    private bool IsDemoMode() =>
        _configuration.GetValue<bool>(
            "Demo:Enabled"
        );

    private string BuildPasswordResetUrl(
        string rawToken
    )
    {
        var frontendBaseUrl =
            _configuration[
                "Frontend:BaseUrl"
            ] ?? "http://localhost:5173";

        var resetPageUrl =
            $"{frontendBaseUrl.TrimEnd('/')}/reset-password";

        return QueryHelpers.AddQueryString(
            resetPageUrl,
            "token",
            rawToken
        );
    }

    private static string HashResetToken(
        string rawToken
    )
    {
        var tokenBytes = Encoding.UTF8.GetBytes(
            rawToken
        );

        return Convert.ToHexString(
            SHA256.HashData(tokenBytes)
        );
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
