using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class ForgotPasswordDto
    {
        [Required]
        [RfcEmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
