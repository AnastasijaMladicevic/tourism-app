using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class RoutePoint
    {
        public int Id { get; set; }

        [Required]
        public int RouteId { get; set; }
        public Route Route { get; set; }

        public short Order { get; set; }
        public Point Geolocation { get; set; }

        [MaxLength(150)]
        public string? PointName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
