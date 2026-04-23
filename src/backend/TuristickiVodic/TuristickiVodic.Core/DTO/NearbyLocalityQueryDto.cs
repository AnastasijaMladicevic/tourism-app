using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class NearbyLocalityQueryDto
    {
        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double Latitude { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double Longitude { get; set; }

        [Range(1, 100000, ErrorMessage = "RadiusMeters must be between 1 and 100000.")]
        public double RadiusMeters { get; set; } = 5000;

        public string? Destination { get; set; }
        public string? Type { get; set; }
        public int? RegionId { get; set; }
        public string? Search { get; set; }

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 10;

        public string? SortOrder { get; set; } = "asc";
    }
}
