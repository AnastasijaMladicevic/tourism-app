using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TuristickiVodic.Core.Models
{
    public class Route
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; }

        public string? Description { get; set; }

        [MaxLength(20)]
        public string? Difficulty { get; set; }

        public decimal? LengthKm { get; set; }

        public int? CreatedByUserId { get; set; }
        [ForeignKey("CreatedByUserId")]
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<RoutePoint> RoutePoints { get; set; }
        public ICollection<Favorite> Favorites { get; set; }
    }
}