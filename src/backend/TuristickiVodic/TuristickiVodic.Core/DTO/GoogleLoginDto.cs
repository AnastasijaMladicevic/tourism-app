using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class GoogleLoginDto
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;

        public bool RememberMe { get; set; }

        [MaxLength(5)]
        public string? Language { get; set; }
    }
}
