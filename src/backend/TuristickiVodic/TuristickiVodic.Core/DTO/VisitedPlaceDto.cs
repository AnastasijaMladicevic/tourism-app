namespace TuristickiVodic.Core.DTO
{
    public class VisitedPlaceDto
    {
        public int Id { get; set; }
        public string Kind { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? DestinationName { get; set; }
        public string? RegionName { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DateTime VisitedAtUtc { get; set; }
    }
}
