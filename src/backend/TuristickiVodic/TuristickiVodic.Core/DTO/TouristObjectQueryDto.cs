using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class TouristObjectQueryDto
    {
        public string? Type { get; set; }
        public string? Destination { get; set; }
        public string? Locality { get; set; }
        public string? Status { get; set; }
        public int? RegionId { get; set; }
        public string[]? Amenities { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public decimal? MinRating { get; set; }
        public decimal? MaxRating { get; set; }
        public string Lang { get; set; } = "sr";
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }

        public string? SortBy { get; set; } = "name";
        public string? SortOrder { get; set; } = "asc";
    }
}
