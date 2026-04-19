using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class UserLocationHistory
    {
        public long Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public Point Location { get; set; }
        public double? AccuracyMeters { get; set; }
        public double? SpeedMetersPerSecond { get; set; }
        public double? HeadingDegrees { get; set; }
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
