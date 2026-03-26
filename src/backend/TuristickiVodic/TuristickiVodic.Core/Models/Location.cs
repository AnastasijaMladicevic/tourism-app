using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;
using System.Text;
using static System.Net.Mime.MediaTypeNames;

namespace TuristickiVodic.Core.Models
{
    public class Location
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; }

        public string? Description { get; set; }

        // NetTopologySuite za geolokaciju
        public Point? Geolocation { get; set; }

        public bool IsActive { get; set; } = true;

        [Required]
        public int LocationTypeId { get; set; }
        public LocationType LocationType { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Destination> Destinations { get; set; }
        public ICollection<User> Users { get; set; }
        public ICollection<Image> Images { get; set; }
    }
}
