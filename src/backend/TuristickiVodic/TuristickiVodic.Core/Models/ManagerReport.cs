using System;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class ManagerReport
    {
        public int Id { get; set; }

        [Required]
        public int ManagerId { get; set; }
        public User Manager { get; set; }

        [Required]
        public int ReportedUserId { get; set; }
        public User ReportedUser { get; set; }

        [Required, MaxLength(500)]
        public string Reason { get; set; }

        public ContentStatus Status { get; set; } = ContentStatus.Pending;

        public int? ResolvedByUserId { get; set; }
        public User? ResolvedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}