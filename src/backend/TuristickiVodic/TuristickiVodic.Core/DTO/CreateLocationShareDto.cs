using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateLocationShareDto
    {
        [Range(1, 24, ErrorMessage = "Duration must be between 1 and 24 hours.")]
        public int DurationHours { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        [Range(0, 100000, ErrorMessage = "AccuracyMeters must be between 0 and 100000.")]
        public double? AccuracyMeters { get; set; }

        public DateTime? RecordedAtUtc { get; set; }
    }
}
