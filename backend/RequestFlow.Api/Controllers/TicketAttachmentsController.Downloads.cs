using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Controllers;

public partial class TicketAttachmentsController
{
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
}
