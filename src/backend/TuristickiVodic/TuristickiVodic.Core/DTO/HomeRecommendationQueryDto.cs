namespace TuristickiVodic.Core.DTO
{
    public class HomeRecommendationQueryDto
    {
        public int PageSize { get; set; } = 12;
        public int? RegionId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
