using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Data;
using RequestFlow.Api.DTOs.Attachments;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/Tickets/{ticketId:int}/attachments")]
public class TicketAttachmentsController : ControllerBase
{
    private const long MaxFileSize =
        10 * 1024 * 1024;

    private const long MaxRequestSize =
        MaxFileSize + 1024 * 1024;

    private static readonly HashSet<string>
        AllowedExtensions =
        new(
            new[]
            {
                ".pdf",
                ".png",
                ".jpg",
                ".jpeg",
                ".webp",
                ".txt",
                ".doc",
                ".docx",
                ".xls",
                ".xlsx",
                ".csv",
                ".zip"
            },
            StringComparer.OrdinalIgnoreCase
        );

    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TicketAttachmentsController>
        _logger;

    public TicketAttachmentsController(
        AppDbContext context,
        IWebHostEnvironment environment,
        IConfiguration configuration,
        ILogger<TicketAttachmentsController> logger
    )
    {
        _context = context;
        _environment = environment;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public async Task<
        ActionResult<List<TicketAttachmentDto>>
    > GetAttachments(int ticketId)
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

        var role = GetCurrentRole();

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(ticket =>
                ticket.Id == ticketId
            );

        if (ticket == null)
        {
            return NotFound(new
            {
                message =
                    "Request could not be found."
            });
        }

        if (!CanAccessTicket(
                ticket,
                currentUserId,
                role
            ))
        {
            return Forbid();
        }

        var isManagement =
            IsManagementRole(role);

        var attachments = await _context
            .TicketAttachments
            .AsNoTracking()
            .Where(attachment =>
                attachment.TicketId == ticketId
            )
            .OrderByDescending(attachment =>
                attachment.CreatedAt
            )
            .Select(attachment =>
                new TicketAttachmentDto
                {
                    Id = attachment.Id,
                    TicketId =
                        attachment.TicketId,
                    UploadedByUserId =
                        attachment.UploadedByUserId,
                    UploadedByName =
                        attachment.UploadedByName,
                    OriginalFileName =
                        attachment.OriginalFileName,
                    ContentType =
                        attachment.ContentType,
                    FileSize =
                        attachment.FileSize,
                    CreatedAt =
                        attachment.CreatedAt,
                    CanDelete =
                        isManagement ||
                        attachment.UploadedByUserId ==
                        currentUserId
                }
            )
            .ToListAsync();

        return Ok(attachments);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxRequestSize)]
    public async Task<
        ActionResult<TicketAttachmentDto>
    > UploadAttachment(
        int ticketId,
        [FromForm] UploadTicketAttachmentDto request
    )
    {
        if (_configuration.GetValue<bool>(
                "Demo:Enabled"
            ))
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "File uploads are disabled in the public demo."
                }
            );
        }

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

        var role = GetCurrentRole();

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(ticket =>
                ticket.Id == ticketId
            );

        if (ticket == null)
        {
            return NotFound(new
            {
                message =
                    "Request could not be found."
            });
        }

        if (!CanAccessTicket(
                ticket,
                currentUserId,
                role
            ))
        {
            return Forbid();
        }

        var file = request.File;

        if (
            file == null ||
            file.Length == 0
        )
        {
            return BadRequest(new
            {
                message =
                    "Please select a file."
            });
        }

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new
            {
                message =
                    "The selected file cannot exceed 10 MB."
            });
        }

        var originalFileName =
            NormalizeFileName(file.FileName);

        var extension = Path
            .GetExtension(originalFileName)
            .ToLowerInvariant();

        if (
            string.IsNullOrWhiteSpace(extension) ||
            !AllowedExtensions.Contains(extension)
        )
        {
            return BadRequest(new
            {
                message =
                    "This file type is not supported."
            });
        }

        var uploadedBy = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.Id == currentUserId
            )
            .Select(user => new
            {
                user.FullName,
                user.Role
            })
            .FirstOrDefaultAsync();

        if (uploadedBy == null)
        {
            return Unauthorized(new
            {
                message =
                    "The authenticated user could not be found."
            });
        }

        var storedFileName =
            $"{Guid.NewGuid():N}{extension}";

        var uploadDirectory = Path.Combine(
            _environment.ContentRootPath,
            "Uploads",
            "Tickets",
            ticketId.ToString()
        );

        Directory.CreateDirectory(
            uploadDirectory
        );

        var physicalPath = Path.Combine(
            uploadDirectory,
            storedFileName
        );

        var relativePath = Path.Combine(
                "Uploads",
                "Tickets",
                ticketId.ToString(),
                storedFileName
            )
            .Replace(
                Path.DirectorySeparatorChar,
                '/'
            );

        try
        {
            await using (
                var stream = new FileStream(
                    physicalPath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None
                )
            )
            {
                await file.CopyToAsync(stream);
            }

            var createdAt =
                DateTime.UtcNow;

            var attachment =
                new TicketAttachment
                {
                    TicketId = ticketId,
                    UploadedByUserId =
                        currentUserId,
                    UploadedByName =
                        uploadedBy.FullName,
                    OriginalFileName =
                        originalFileName,
                    StoredFileName =
                        storedFileName,
                    ContentType =
                        NormalizeContentType(
                            file.ContentType
                        ),
                    FileSize =
                        file.Length,
                    RelativePath =
                        relativePath,
                    CreatedAt =
                        createdAt
                };

            _context.TicketAttachments.Add(
                attachment
            );

            var activity =
                new TicketActivity
                {
                    TicketId = ticketId,
                    ActorUserId =
                        currentUserId,
                    ActorName =
                        uploadedBy.FullName,
                    ActorRole =
                        uploadedBy.Role,
                    Type = "attachment",
                    Title =
                        "Attachment uploaded",
                    Description =
                        $"File \"{originalFileName}\" was added to the request.",
                    CreatedAt =
                        createdAt
                };

            _context.TicketActivities.Add(
                activity
            );

            AddNotifications(
                ticket: ticket,
                recipientUserIds: new int?[]
                {
                    ticket.CreatedByUserId,
                    ticket.AssignedToUserId
                },
                actorUserId: currentUserId,
                type: "attachment",
                title: "New attachment uploaded",
                message:
                    $"{uploadedBy.FullName} uploaded \"{originalFileName}\" to request #{ticket.Id} \"{ticket.Title}\".",
                createdAt: createdAt
            );

            await _context.SaveChangesAsync();

            var response =
                new TicketAttachmentDto
                {
                    Id = attachment.Id,
                    TicketId =
                        attachment.TicketId,
                    UploadedByUserId =
                        attachment.UploadedByUserId,
                    UploadedByName =
                        attachment.UploadedByName,
                    OriginalFileName =
                        attachment.OriginalFileName,
                    ContentType =
                        attachment.ContentType,
                    FileSize =
                        attachment.FileSize,
                    CreatedAt =
                        attachment.CreatedAt,
                    CanDelete = true
                };

            return CreatedAtAction(
                nameof(GetAttachments),
                new
                {
                    ticketId
                },
                response
            );
        }
        catch (Exception exception)
        {
            if (System.IO.File.Exists(
                    physicalPath
                ))
            {
                try
                {
                    System.IO.File.Delete(
                        physicalPath
                    );
                }
                catch (Exception deleteException)
                {
                    _logger.LogWarning(
                        deleteException,
                        "The failed upload file could not be removed: {Path}",
                        physicalPath
                    );
                }
            }

            _logger.LogError(
                exception,
                "Attachment upload failed for ticket {TicketId}.",
                ticketId
            );

            return Problem(
                title:
                    "Attachment upload failed.",
                detail:
                    "The file could not be saved.",
                statusCode:
                    StatusCodes.Status500InternalServerError
            );
        }
    }

    [HttpGet("{attachmentId:int}/download")]
    public async Task<IActionResult>
        DownloadAttachment(
            int ticketId,
            int attachmentId
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

        var role = GetCurrentRole();

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(ticket =>
                ticket.Id == ticketId
            );

        if (ticket == null)
        {
            return NotFound(new
            {
                message =
                    "Request could not be found."
            });
        }

        if (!CanAccessTicket(
                ticket,
                currentUserId,
                role
            ))
        {
            return Forbid();
        }

        var attachment = await _context
            .TicketAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(attachment =>
                attachment.Id == attachmentId &&
                attachment.TicketId == ticketId
            );

        if (attachment == null)
        {
            return NotFound(new
            {
                message =
                    "Attachment could not be found."
            });
        }

        var physicalPath =
            GetPhysicalPath(
                attachment.RelativePath
            );

        if (!System.IO.File.Exists(
                physicalPath
            ))
        {
            return NotFound(new
            {
                message =
                    "The attachment file is missing from the server."
            });
        }

        var stream = new FileStream(
            physicalPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read
        );

        return File(
            stream,
            string.IsNullOrWhiteSpace(
                attachment.ContentType
            )
                ? "application/octet-stream"
                : attachment.ContentType,
            attachment.OriginalFileName
        );
    }

    [HttpDelete("{attachmentId:int}")]
    public async Task<IActionResult>
        DeleteAttachment(
            int ticketId,
            int attachmentId
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

        var role = GetCurrentRole();

        var ticket = await _context.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(ticket =>
                ticket.Id == ticketId
            );

        if (ticket == null)
        {
            return NotFound(new
            {
                message =
                    "Request could not be found."
            });
        }

        if (!CanAccessTicket(
                ticket,
                currentUserId,
                role
            ))
        {
            return Forbid();
        }

        var attachment = await _context
            .TicketAttachments
            .FirstOrDefaultAsync(attachment =>
                attachment.Id == attachmentId &&
                attachment.TicketId == ticketId
            );

        if (attachment == null)
        {
            return NotFound(new
            {
                message =
                    "Attachment could not be found."
            });
        }

        var canDelete =
            IsManagementRole(role) ||
            attachment.UploadedByUserId ==
            currentUserId;

        if (!canDelete)
        {
            return Forbid();
        }

        var currentUser = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.Id == currentUserId
            )
            .Select(user => new
            {
                user.FullName,
                user.Role
            })
            .FirstOrDefaultAsync();

        var originalFileName =
            attachment.OriginalFileName;

        var physicalPath =
            GetPhysicalPath(
                attachment.RelativePath
            );

        _context.TicketAttachments.Remove(
            attachment
        );

        var activity =
            new TicketActivity
            {
                TicketId = ticketId,
                ActorUserId = currentUserId,
                ActorName = currentUser?.FullName ?? "RequestFlow User",
                ActorRole = currentUser?.Role ?? role,
                Type = "attachment",
                Title = "Attachment deleted",
                Description = $"File \"{originalFileName}\" was removed from the request.",
                CreatedAt = DateTime.UtcNow
            };

        _context.TicketActivities.Add(
            activity
        );

        await _context.SaveChangesAsync();

        try
        {
            if (System.IO.File.Exists(
                    physicalPath
                ))
            {
                System.IO.File.Delete(
                    physicalPath
                );
            }
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Attachment database record was deleted, but the physical file could not be removed: {Path}",
                physicalPath
            );
        }

        return NoContent();
    }

    private void AddNotifications(
        Ticket ticket,
        IEnumerable<int?> recipientUserIds,
        int actorUserId,
        string type,
        string title,
        string message,
        DateTime createdAt
    )
    {
#pragma warning disable CS8629 // Nullable value type may be null.
        var uniqueRecipientIds =
            recipientUserIds
                .Where(userId =>
                    userId.HasValue &&
                    userId.Value > 0 &&
                    userId.Value != actorUserId
                )
                .Select(userId =>
                    userId.Value
                )
                .Distinct()
                .ToList();
#pragma warning restore CS8629 // Nullable value type may be null.

        foreach (
            var recipientUserId
            in uniqueRecipientIds
        )
        {
            var notification =
                new Notification
                {
                    UserId =
                        recipientUserId,
                    TicketId =
                        ticket.Id,
                    Type =
                        NormalizeText(
                            type,
                            30,
                            "attachment"
                        ),
                    Title =
                        NormalizeText(
                            title,
                            150,
                            "New attachment"
                        ),
                    Message =
                        NormalizeText(
                            message,
                            500,
                            "A new attachment was uploaded to a request."
                        ),
                    IsRead = false,
                    CreatedAt =
                        createdAt,
                    ReadAt = null
                };

            _context.Notifications.Add(
                notification
            );
        }
    }

    private string GetPhysicalPath(
        string relativePath
    )
    {
        var normalizedPath =
            relativePath.Replace(
                '/',
                Path.DirectorySeparatorChar
            );

        return Path.Combine(
            _environment.ContentRootPath,
            normalizedPath
        );
    }

    private bool TryGetCurrentUserId(
        out int currentUserId
    )
    {
        var userIdValue =
            User.FindFirst("sub")?.Value ??
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        return int.TryParse(
            userIdValue,
            out currentUserId
        );
    }

    private string GetCurrentRole()
    {
        var role =
            User.FindFirst("role")?.Value ??
            User.FindFirst(
                ClaimTypes.Role
            )?.Value ??
            "User";

        return role
            .Trim()
            .ToLowerInvariant();
    }

    private static bool IsManagementRole(
        string role
    )
    {
        return role == "admin" ||
               role == "supervisor";
    }

    private static bool CanAccessTicket(
        Ticket ticket,
        int currentUserId,
        string role
    )
    {
        if (IsManagementRole(role))
        {
            return true;
        }

        if (role == "staff")
        {
            return ticket.AssignedToUserId ==
                   currentUserId;
        }

        return ticket.CreatedByUserId ==
               currentUserId;
    }

    private static string NormalizeFileName(
        string fileName
    )
    {
        var safeFileName =
            Path.GetFileName(fileName)
                .Trim();

        if (
            string.IsNullOrWhiteSpace(
                safeFileName
            )
        )
        {
            return "attachment";
        }

        if (safeFileName.Length <= 255)
        {
            return safeFileName;
        }

        var extension =
            Path.GetExtension(safeFileName);

        var nameWithoutExtension =
            Path.GetFileNameWithoutExtension(
                safeFileName
            );

        var maximumNameLength =
            Math.Max(
                1,
                255 - extension.Length
            );

        return
            $"{nameWithoutExtension[..Math.Min(nameWithoutExtension.Length, maximumNameLength)]}{extension}";
    }

    private static string NormalizeContentType(
        string? contentType
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                contentType
            )
        )
        {
            return "application/octet-stream";
        }

        var normalized =
            contentType.Trim();

        return normalized.Length > 150
            ? normalized[..150]
            : normalized;
    }

    private static string NormalizeText(
        string? value,
        int maximumLength,
        string fallback
    )
    {
        var normalizedValue =
            string.IsNullOrWhiteSpace(value)
                ? fallback
                : value.Trim();

        return normalizedValue.Length >
               maximumLength
            ? normalizedValue[
                ..maximumLength
            ]
            : normalizedValue;
    }
}
