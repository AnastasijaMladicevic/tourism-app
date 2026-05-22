using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class Destination
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; }

        [MaxLength(250)]
        public string? DisplayTitle { get; set; }

        public string? Description { get; set; }
        public Point? Geolocation { get; set; }

        public ContentStatus Status { get; set; } = ContentStatus.Pending;

        public bool IsActive { get; set; } = true;

        [Required]
        public int DestinationTypeId { get; set; }
        public DestinationType DestinationType { get; set; }

        [Required]
        public int RegionId { get; set; } = 1;
        public Region Region { get; set; }

        [Required]
        public int CreatedByUserId { get; set; }

        [ForeignKey("CreatedByUserId")]
        public User CreatedBy { get; set; }

        public int? ManagedByUserId { get; set; }
        public User? ManagedBy { get; set; }

        public int? EditLockedByUserId { get; set; }
        public DateTime? EditLockAcquiredAtUtc { get; set; }
        public DateTime? EditLockExpiresAtUtc { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Locality> Localities { get; set; } = new List<Locality>();
        public ICollection<Image> Images { get; set; } = new List<Image>();
        public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public ICollection<TouristObject> Objects { get; set; } = new List<TouristObject>();
        public ICollection<Event> Events { get; set; } = new List<Event>();
        public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    }
}
