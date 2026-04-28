namespace TuristickiVodic.Core.DTO
{
    public class AiChatRequestDto
    {
        public string Message { get; set; } = string.Empty;
        public List<AiChatMessageDto> History { get; set; } = [];
        public int? RegionId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
