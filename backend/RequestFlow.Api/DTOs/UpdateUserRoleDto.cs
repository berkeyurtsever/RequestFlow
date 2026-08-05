using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs;

public class UpdateUserRoleDto
{
    [Required]
    public string Role { get; set; } = string.Empty;
}