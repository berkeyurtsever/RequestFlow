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
public partial class TicketAttachmentsController : ControllerBase
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
}
