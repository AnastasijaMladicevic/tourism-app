using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class NearbyTouristObjectQueryDto
    {
        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double Latitude { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double Longitude { get; set; }

        [Range(1, 3000000, ErrorMessage = "RadiusMeters must be between 1 and 3000000.")]
        public double RadiusMeters { get; set; } = 5000;

        public string? Type { get; set; }
        public string? Destination { get; set; }
        public string? Locality { get; set; }
        public int? RegionId { get; set; }
        public string? Search { get; set; }
        public string[]? Amenities { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public decimal? MinRating { get; set; }
        public decimal? MaxRating { get; set; }
        public string Lang { get; set; } = "sr";

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 10;

        public string? SortOrder { get; set; } = "asc";
    }
}
