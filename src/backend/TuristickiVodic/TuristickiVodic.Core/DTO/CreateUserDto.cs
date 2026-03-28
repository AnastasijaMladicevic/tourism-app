using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTOs
{
    public class CreateUserDto
    {
        [Required, MaxLength(100)]
        public string FirstName { get; set; }

        [Required, MaxLength(100)]
        public string LastName { get; set; }

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required, EmailAddress, MaxLength(200)]
        public string Email { get; set; }

        [Required, MinLength(6)]
        public string Password { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [MaxLength(5)]
        public string Language { get; set; } = "sr";
    }
}