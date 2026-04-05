using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class LoginDto
    {
        [Required, EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
        public bool RememberMe { get; set; } = false;

    }
}