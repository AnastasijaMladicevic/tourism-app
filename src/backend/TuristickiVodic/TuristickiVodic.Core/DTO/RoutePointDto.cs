using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class RoutePointDto
    {
        public int Id { get; set; }
        public int RouteId { get; set; }
        public short Order { get; set; }
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public string? PointName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateRoutePointDto
    {
        [Required]
        public short Order { get; set; }

        [Required]
        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double Longitude { get; set; }

        [Required]
        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double Latitude { get; set; }

        [MaxLength(150)]
        public string? PointName { get; set; }
    }

    public class UpdateRoutePointDto
    {
        public short? Order { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        [MaxLength(150)]
        public string? PointName { get; set; }
    }
}
