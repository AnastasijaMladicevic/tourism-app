namespace TuristickiVodic.Core.DTO
{
    public class AiSemanticSearchQueryDto
    {
        public string Query { get; set; } = string.Empty;
        public int PageSize { get; set; } = 8;
        public int? RegionId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
