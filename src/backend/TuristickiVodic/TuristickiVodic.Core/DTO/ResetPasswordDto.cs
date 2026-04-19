using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class ResetPasswordDto
    {
        [Required]
        public string ResetSessionToken { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;

        [Required, Compare("NewPassword")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
