using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTOs
{
    public class RefreshTokenDto
    {
        [Required]
        public string RefreshToken { get; set; }
    }
}
