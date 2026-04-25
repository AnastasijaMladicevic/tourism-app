namespace TuristickiVodic.Core.DTO
{
    public class SmartSearchResultDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TypeName { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string MarkerType { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string MatchReason { get; set; } = string.Empty;
        public double Score { get; set; }
    }
}
