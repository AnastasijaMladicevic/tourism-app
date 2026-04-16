using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class ResetPasswordDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required, RegularExpression(@"^\d{6}$")]
        public string Code { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;

        [Required, Compare("NewPassword")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
