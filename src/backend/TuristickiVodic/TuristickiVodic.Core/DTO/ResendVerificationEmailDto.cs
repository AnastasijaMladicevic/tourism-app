using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class ResendVerificationEmailDto
    {
        [Required]
        [RfcEmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
