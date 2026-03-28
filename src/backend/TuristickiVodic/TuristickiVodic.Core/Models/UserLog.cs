using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class UserLog
    {
        public long Id { get; set; }

        public int? UserId { get; set; }
        public User? User { get; set; }

        // Za anonimne korisnike
        [MaxLength(100)]
        public string? SessionId { get; set; }

        public int? ObjectId { get; set; }
        public TouristObject? Object { get; set; }

        [Required]
        public string Action { get; set; }

        public int? DurationSeconds { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
