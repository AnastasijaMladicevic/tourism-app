using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class Activity
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; }

        public string? Description { get; set; }
        public Point? Geolocation { get; set; }

        public decimal? Price { get; set; }
        public int? DurationMinutes { get; set; }

        public ContentStatus Status { get; set; }
            = ContentStatus.Pending;

        public bool IsActive { get; set; } = true;

        [Required]
        public int ActivityTypeId { get; set; }
        public ActivityType ActivityType { get; set; }

        [Required]
        public int LocationId { get; set; }
        public Location Location { get; set; }

        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        public int? ObjectId { get; set; }
        public TouristObject? Object { get; set; }

        [Required]
        public int CreatedByUserId { get; set; }

        [ForeignKey("CreatedByUserId")]
        public User CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Image> Images { get; set; }
        public ICollection<Favorite> Favorites { get; set; }
        public ICollection<UserActivity> UserActivities { get; set; }
    }
}