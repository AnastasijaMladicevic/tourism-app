using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string FirstName { get; set; }

        [Required, MaxLength(100)]
        public string LastName { get; set; }

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required, MaxLength(200)]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [MaxLength(5)]
        public string Language { get; set; } = "sr";

        public bool IsVerified { get; set; } = false;
        public string? VerificationToken { get; set; }
        public DateTime? VerificationTokenExpiry { get; set; }

        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }

        public Point? LastKnownLocation { get; set; }
        public double? LastLocationAccuracyMeters { get; set; }
        public DateTime? LastLocationUpdatedAt { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsBlacklisted { get; set; } = false;
        public bool HasRequestedCreatorRole { get; set; } = false;
        [MaxLength(500)]
        public string? ProfileImageUrl { get; set; }

        [Required]
        public int RoleId { get; set; }
        public Role Role { get; set; }

        public int? ManagedDestinationId { get; set; }

        [ForeignKey("ManagedDestinationId")]
        public Destination? ManagedDestination { get; set; }

        public int? PreferredRegionId { get; set; }

        [ForeignKey("PreferredRegionId")]
        public Region? PreferredRegion { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public ICollection<EventPlannerItem> EventPlannerItems { get; set; } = new List<EventPlannerItem>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<UserLog> UserLogs { get; set; } = new List<UserLog>();
        public ICollection<UserLocationHistory> LocationHistory { get; set; } = new List<UserLocationHistory>();
        public ICollection<ManagerReport> SentReports { get; set; } = new List<ManagerReport>();

        public RefreshToken? RefreshToken { get; set; }
        public ICollection<TouristObject> CreatedObjects { get; set; } = new List<TouristObject>();
        public ICollection<Event> CreatedEvents { get; set; } = new List<Event>();
        public ICollection<Destination> CreatedDestinations { get; set; } = new List<Destination>();
    }
}
