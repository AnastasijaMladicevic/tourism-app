using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models
{
    public class Locality
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; }

        public string? Description { get; set; }

        public Point? Geolocation { get; set; }

        public bool IsActive { get; set; } = true;

        [Required]
        public int DestinationId { get; set; }
        public Destination Destination { get; set; }

        [Required]
        public int LocalityTypeId { get; set; }
        public LocalityType LocalityType { get; set; }

        // Ko je kreirao lokalitet (može biti menadžer ili admin)
        public int? CreatedByUserId { get; set; }
        [ForeignKey("CreatedByUserId")]
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigacije
        public ICollection<TouristObject> Objects { get; set; }
        public ICollection<Event> Events { get; set; }
        public ICollection<Activity> Activities { get; set; }
        public ICollection<Image> Images { get; set; }
        public ICollection<Favorite> Favorites { get; set; }
    }
}