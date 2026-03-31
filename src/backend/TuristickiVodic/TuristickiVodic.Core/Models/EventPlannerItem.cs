using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class EventPlannerItem
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        public User User { get; set; }

        [Required]
        public int EventId { get; set; }
        public Event Event { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}
