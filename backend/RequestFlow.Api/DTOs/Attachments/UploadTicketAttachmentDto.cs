using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace RequestFlow.Api.DTOs.Attachments;

public class UploadTicketAttachmentDto
{
    [Required(
        ErrorMessage = "Please select a file."
    )]
    public IFormFile File { get; set; } =
        null!;
}