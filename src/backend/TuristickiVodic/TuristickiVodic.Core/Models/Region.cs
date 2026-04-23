using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class Region
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public double? CenterLongitude { get; set; }
        public double? CenterLatitude { get; set; }
        public double? DefaultMapZoom { get; set; }

        public bool IsDefault { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Destination> Destinations { get; set; } = new List<Destination>();
        public ICollection<User> PreferredByUsers { get; set; } = new List<User>();
    }
}
