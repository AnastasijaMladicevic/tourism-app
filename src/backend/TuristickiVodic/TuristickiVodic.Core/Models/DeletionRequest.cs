using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TuristickiVodic.Core.Models
{
    public class DeletionRequest
    {
        public int Id { get; set; }

        [Required]
        public int ObjectId { get; set; }

        [ForeignKey("ObjectId")]
        public TouristObject Object { get; set; }

        [Required]
        public int RequestedByUserId { get; set; }

        [ForeignKey("RequestedByUserId")]
        public User RequestedBy { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        public ContentStatus Status { get; set; } = ContentStatus.Pending;

        public int? ReviewedByUserId { get; set; }

        [ForeignKey("ReviewedByUserId")]
        public User? ReviewedBy { get; set; }

        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
