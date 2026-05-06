using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class TouristObjectReviewDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Text { get; set; } = string.Empty;
        public string? CreatorResponse { get; set; }
        public DateTime? CreatorResponseAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ReviewedByUserId { get; set; }
        public string? ReviewedByFullName { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ReviewImageDto> Images { get; set; } = new();
    }
}
