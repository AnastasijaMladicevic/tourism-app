using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class Event
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; }

        public string? Description { get; set; }
        public Point? Geolocation { get; set; }

        [Required]
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }
        public int? MaxVisitors { get; set; }

        public bool IsActive { get; set; } = true;

        public ContentStatus Status { get; set; } = ContentStatus.Pending;

        [Required]
        public int EventTypeId { get; set; }
        public EventType EventType { get; set; }

        public int? LocalityId { get; set; }
        public Locality? Locality { get; set; }

        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        public int? ObjectId { get; set; }
        public TouristObject? Object { get; set; }

        [Required]
        public int CreatedByUserId { get; set; }
        [ForeignKey("CreatedByUserId")]
        public User CreatedBy { get; set; }

        public int? ApprovedByUserId { get; set; }
        [ForeignKey("ApprovedByUserId")]
        public User? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Image> Images { get; set; } = new List<Image>();
        public ICollection<EventPlannerItem> EventPlannerItems { get; set; } = new List<EventPlannerItem>();
    }
}