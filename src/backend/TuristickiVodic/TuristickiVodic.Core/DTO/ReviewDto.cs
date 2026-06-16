using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class ReviewDto
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public string UserFullName { get; set; } = string.Empty;

        public int ObjectId { get; set; }

        public string ObjectName { get; set; } = string.Empty;

        public string ObjectTypeName { get; set; } = string.Empty;

        public string? LocalityName { get; set; }

        public string? DestinationName { get; set; }

        public string? Address { get; set; }

        public int RegionId { get; set; }

        public string RegionName { get; set; } = string.Empty;

        public string RegionCode { get; set; } = string.Empty;

        public int Rating { get; set; }

        public string Text { get; set; } = string.Empty;

        public string? CreatorResponse { get; set; }

        public DateTime? CreatorResponseAt { get; set; }

        public string Status { get; set; } = string.Empty;

        public int? ReviewedByUserId { get; set; }

        public string? ReviewedByFullName { get; set; }

        public int? CreatedByUserId { get; set; }

        public string? CreatedByFullName { get; set; }

        public DateTime CreatedAt { get; set; }

        public List<ReviewImageDto> Images { get; set; } = new();
    }
}
