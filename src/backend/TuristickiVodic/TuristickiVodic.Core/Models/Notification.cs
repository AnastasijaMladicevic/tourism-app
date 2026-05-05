using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class Notification
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [Required]
        public NotificationType Type { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required, MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }

        public int? EventId { get; set; }
        public Event? Event { get; set; }

        public int? EventPlannerItemId { get; set; }
        public EventPlannerItem? EventPlannerItem { get; set; }

        public DateTime? TriggerAtUtc { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
