using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class Review
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        public User User { get; set; }

        [Required]
        public int ObjectId { get; set; }
        public TouristObject Object { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        [Required]
        public string Text { get; set; }

        public string? CreatorResponse { get; set; }
        public DateTime? CreatorResponseAt { get; set; }

        public ContentStatus Status { get; set; } = ContentStatus.Pending;

        public int? ReviewedByUserId { get; set; }
        public User? ReviewedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ReviewImage> Images { get; set; } = new List<ReviewImage>();
    }
}
