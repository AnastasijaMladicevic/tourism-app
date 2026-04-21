using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class VerifyResetCodeDto
    {
        [Required]
        [RfcEmailAddress]
        public string Email { get; set; }

        [Required, RegularExpression(@"^\d{6}$")]
        public string Code { get; set; } = string.Empty;
    }
}
