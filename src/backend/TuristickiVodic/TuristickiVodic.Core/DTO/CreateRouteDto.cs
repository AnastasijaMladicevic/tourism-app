using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateRoutePointDto
    {
        [Required]
        public short Order { get; set; }

        [Required]
        public double Longitude { get; set; }

        [Required]
        public double Latitude { get; set; }

        [MaxLength(150)]
        public string? PointName { get; set; }
    }

    public class CreateRouteDto
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(20)]
        public string? Difficulty { get; set; }

        public decimal? LengthKm { get; set; }

        [Required, MinLength(2)]
        public List<CreateRoutePointDto> RoutePoints { get; set; } = new();
    }
}