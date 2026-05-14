using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class ResendTwoFactorLoginCodeDto
    {
        [Required]
        public string ChallengeToken { get; set; } = string.Empty;
    }
}
