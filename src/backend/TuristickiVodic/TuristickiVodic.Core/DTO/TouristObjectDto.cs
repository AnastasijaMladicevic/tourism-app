using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class TouristObjectDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? MainImageUrl { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Website { get; set; }
        public string? MenuUrl { get; set; }
        public string? CuisineType { get; set; }
        public string? WorkingHours { get; set; }
        public decimal? Price { get; set; }
        public string[] Amenities { get; set; } = Array.Empty<string>();
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public double? DistanceMeters { get; set; }
        public bool IsActive { get; set; }
        public decimal AverageRating { get; set; }
        public int ReviewCount { get; set; }
        public List<TouristObjectReviewDto> Reviews { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public bool HasPendingDeletionRequest { get; set; }
        public int ObjectTypeId { get; set; }
        public string ObjectTypeName { get; set; } = string.Empty;
        public int? LocalityId { get; set; }
        public string? LocalityName { get; set; }
        public int DestinationId { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public int CreatedByUserId { get; set; }
        public int? ApprovedByUserId { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
