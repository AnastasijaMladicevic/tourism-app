using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateTouristObjectDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }

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

        public int? ObjectTypeId { get; set; }

        public int? DestinationId { get; set; }
        public int? LocalityId { get; set; }
    }
}