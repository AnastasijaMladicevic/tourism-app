namespace TuristickiVodic.Core.DTO
{
    public class AiSemanticSearchResponseDto
    {
        public string Provider { get; set; } = "fallback";
        public bool UsedFallback { get; set; }
        public string? Warning { get; set; }
        public string QuerySummary { get; set; } = string.Empty;
        public string? RegionName { get; set; }
        public List<string> Categories { get; set; } = [];
        public List<SmartSearchResultDto> Results { get; set; } = [];
    }
}
