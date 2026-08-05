using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs;

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}