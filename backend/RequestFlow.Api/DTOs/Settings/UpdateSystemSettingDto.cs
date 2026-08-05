using System.ComponentModel.DataAnnotations;

namespace RequestFlow.Api.DTOs.Settings;

public class UpdateSystemSettingDto
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string SystemName { get; set; } =
        string.Empty;

    [Required]
    [StringLength(250, MinimumLength = 3)]
    public string SystemDescription { get; set; } =
        string.Empty;

    [Required]
    public string DefaultPriority { get; set; } =
        "Medium";

    public bool AutoAssignment { get; set; }

    public bool EmailNotifications { get; set; }

    public bool NotifyNewRequest { get; set; }

    public bool NotifyAssignment { get; set; }

    public bool NotifyStatusChange { get; set; }

    public bool NotifyComments { get; set; }
}