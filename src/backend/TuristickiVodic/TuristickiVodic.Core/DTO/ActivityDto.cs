using System;

namespace TuristickiVodic.Core.DTO
{
    public class ActivityDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string? MainImageUrl { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }
        public double? DistanceMeters { get; set; }
        public bool HasPendingDeletionRequest { get; set; }
        public bool IsActive { get; set; }

        public decimal? Price { get; set; }

        public int? DurationMinutes { get; set; }

        public int ActivityTypeId { get; set; }

        public string ActivityTypeName { get; set; } = string.Empty;

        public int? LocalityId { get; set; }

        public string? LocalityName { get; set; }

        public int? DestinationId { get; set; }

        public string? DestinationName { get; set; }

        public int? ObjectId { get; set; }

        public string? ObjectName { get; set; }

        public int CreatedByUserId { get; set; }

        public string Status { get; set; } = string.Empty;

        public int? ApprovedByUserId { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
