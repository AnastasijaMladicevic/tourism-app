using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class ForgotPasswordDto
    {
        [Required, EmailAddress]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$", ErrorMessage = "Neispravan format email-a")]
        public string Email { get; set; } = string.Empty;
    }
}
