namespace TuristickiVodic.Core.DTO
{
    public class UserPreferredRegionDto
    {
        public int? PreferredRegionId { get; set; }
        public int? EffectiveRegionId { get; set; }
        public string? EffectiveRegionName { get; set; }
        public string? EffectiveRegionCode { get; set; }
        public double? CenterLongitude { get; set; }
        public double? CenterLatitude { get; set; }
        public double? DefaultMapZoom { get; set; }
        public bool IsDefaultFallback { get; set; }
    }
}
