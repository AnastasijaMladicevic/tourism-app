using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class Favorite
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        public User User { get; set; }

        public int? ObjectId { get; set; }
        public TouristObject? Object { get; set; }

        public int? ActivityId { get; set; }
        public Activity? Activity { get; set; }

        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        public int? RouteId { get; set; }
        public Route? Route { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}