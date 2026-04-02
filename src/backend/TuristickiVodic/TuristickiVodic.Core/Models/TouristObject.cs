using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class TouristObject
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; }

        public string? Description { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Website { get; set; }

        public string? WorkingHours { get; set; }

        public Point? Geolocation { get; set; }

        public decimal AverageRating { get; set; } = 0;
        public int ReviewCount { get; set; } = 0;

        public ContentStatus Status { get; set; } = ContentStatus.Pending;
        public bool IsActive { get; set; } = true;

        [Required]
        public int ObjectTypeId { get; set; }
        public ObjectType ObjectType { get; set; }

        [Required]
        public int LocalityId { get; set; }
        public Locality Locality { get; set; }

        // Opciono - može biti direktno vezan za destinaciju
        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        [Required]
        public int CreatedByUserId { get; set; }
        [ForeignKey("CreatedByUserId")]
        public User CreatedBy { get; set; }

        // Ko je odobrio (menadžer ili admin)
        public int? ApprovedByUserId { get; set; }
        [ForeignKey("ApprovedByUserId")]
        public User? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigacije
        public ICollection<Review> Reviews { get; set; }
        public ICollection<Image> Images { get; set; }
        public ICollection<Favorite> Favorites { get; set; }
        public ICollection<Activity> Activities { get; set; }
        public ICollection<Event> Events { get; set; }
    }
}