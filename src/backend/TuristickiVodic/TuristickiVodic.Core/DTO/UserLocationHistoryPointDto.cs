namespace TuristickiVodic.Core.DTO
{
    public class UserLocationHistoryPointDto
    {
        public long Id { get; set; }
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public double? AccuracyMeters { get; set; }
        public double? SpeedMetersPerSecond { get; set; }
        public double? HeadingDegrees { get; set; }
        public DateTime RecordedAt { get; set; }
    }
}
