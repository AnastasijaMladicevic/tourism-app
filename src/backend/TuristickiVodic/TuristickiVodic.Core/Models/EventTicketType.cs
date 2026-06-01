using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class EventTicketType
    {
        public int Id { get; set; }

        [Required, MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        public decimal Price { get; set; }

        public int SortOrder { get; set; }

        [Required]
        public int EventId { get; set; }

        public Event Event { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
