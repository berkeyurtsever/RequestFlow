using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.DTOs.Attachments;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

public partial class TicketAttachmentsController
{
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
}
