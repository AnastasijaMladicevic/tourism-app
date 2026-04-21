using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class LoginDto
    {
        [Required]
        [RfcEmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
        public bool RememberMe { get; set; } = false;

    }
}
