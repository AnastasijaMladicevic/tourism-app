namespace TuristickiVodic.Core.DTO
{
    public class RegionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public double? CenterLongitude { get; set; }
        public double? CenterLatitude { get; set; }
        public double? DefaultMapZoom { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }
}
