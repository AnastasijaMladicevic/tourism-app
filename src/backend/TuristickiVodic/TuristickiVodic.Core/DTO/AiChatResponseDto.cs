namespace TuristickiVodic.Core.DTO
{
    public class AiChatResponseDto
    {
        public string Answer { get; set; } = string.Empty;
        public string Provider { get; set; } = "fallback";
        public bool UsedTool { get; set; }
        public bool UsedFallback { get; set; }
        public string? Warning { get; set; }
        public List<SmartSearchResultDto> Results { get; set; } = [];
    }
}
