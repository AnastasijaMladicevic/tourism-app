using System;

namespace TuristickiVodic.Core.DTO
{
    public class DestinationDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? DisplayTitle { get; set; }
        public string? Description { get; set; }
        public string? MainImageUrl { get; set; }
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public int DestinationTypeId { get; set; }
        public string DestinationTypeName { get; set; } = string.Empty;
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public string RegionCode { get; set; } = string.Empty;
        public int CreatedByUserId { get; set; }
        public int? ManagedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DestinationEditLockDto? EditLock { get; set; }
    }
}
