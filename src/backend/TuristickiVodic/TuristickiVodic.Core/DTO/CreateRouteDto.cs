using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
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