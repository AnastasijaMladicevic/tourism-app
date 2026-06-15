using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class VerifyEmailDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }
}
