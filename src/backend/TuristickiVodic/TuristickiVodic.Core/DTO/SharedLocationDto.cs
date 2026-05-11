namespace TuristickiVodic.Core.DTO
{
    public class SharedLocationDto
    {
        public string DisplayName { get; set; } = string.Empty;
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public double? AccuracyMeters { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
    }
}
