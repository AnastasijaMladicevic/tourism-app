using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class LoginDto
    {
        [Required, EmailAddress]
        [RegularExpression(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", ErrorMessage = "Neispravan format email-a")]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
        public bool RememberMe { get; set; } = false;

    }
}