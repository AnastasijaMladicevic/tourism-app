using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateTouristObjectDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Website { get; set; }

        public string? WorkingHours { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        [Required]
        public int ObjectTypeId { get; set; }

        [Required]
        public int LocalityId { get; set; }

        public bool IsActive { get; set; } = true;
    }
}