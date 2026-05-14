using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class VerifyTwoFactorLoginDto
    {
        [Required]
        public string ChallengeToken { get; set; } = string.Empty;

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = string.Empty;
    }
}
