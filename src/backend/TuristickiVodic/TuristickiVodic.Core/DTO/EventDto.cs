using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class EventDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }
        public bool IsActive { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }

        public int? MaxVisitors { get; set; }

        public string Status { get; set; } = string.Empty;

        public int EventTypeId { get; set; }

        public string EventTypeName { get; set; } = string.Empty;

        public int? LocalityId { get; set; }

        public string? LocalityName { get; set; }

        public int? DestinationId { get; set; }

        public string? DestinationName { get; set; }

        public int? ObjectId { get; set; }

        public string? ObjectName { get; set; }

        public int CreatedByUserId { get; set; }

        public int? ApprovedByUserId { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
