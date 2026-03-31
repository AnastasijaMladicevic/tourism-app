using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateRouteDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        public string? Description { get; set; }

        [MaxLength(20)]
        public string? Difficulty { get; set; }

        public decimal? LengthKm { get; set; }

        // Ako je prosleđeno, zamenjuje sve tačke rute
        public List<CreateRoutePointDto>? RoutePoints { get; set; }
    }
}