using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTOs
{
    public class CreateActivityDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public decimal? Price { get; set; }

        public int? DurationMinutes { get; set; }

        [Required]
        public int ActivityTypeId { get; set; }

        public int? LocationId { get; set; }

        public int? DestinationId { get; set; }

        public int? ObjectId { get; set; }

        public bool IsActive { get; set; } = true;
    }
}