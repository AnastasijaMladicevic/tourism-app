namespace TuristickiVodic.Core.DTO
{
    public class UserLocationPathDto
    {
        public List<UserLocationHistoryPointDto> Points { get; set; } = new();
        public int PointCount { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public double ApproximateDistanceMeters { get; set; }
    }
}
