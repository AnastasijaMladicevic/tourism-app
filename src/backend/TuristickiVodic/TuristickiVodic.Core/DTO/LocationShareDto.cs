namespace TuristickiVodic.Core.DTO
{
    public class LocationShareDto
    {
        public string ShareUrl { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
    }
}
