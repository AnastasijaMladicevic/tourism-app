namespace TuristickiVodic.Core.DTO
{
    public class RecommendationItemDto
    {
        public string ItemType { get; set; } = string.Empty;
        public int ItemId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal? AverageRating { get; set; }
        public int ReviewCount { get; set; }
        public decimal? Price { get; set; }
        public int? DurationMinutes { get; set; }
        public double? DistanceMeters { get; set; }
        public double Score { get; set; }
    }
}
