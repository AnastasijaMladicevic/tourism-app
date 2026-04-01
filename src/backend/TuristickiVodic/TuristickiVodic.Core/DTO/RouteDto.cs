using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class RouteDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Difficulty { get; set; }
        public decimal? LengthKm { get; set; }

        public int? CreatedByUserId { get; set; }
        public string? CreatedByFullName { get; set; }

        public List<RoutePointDto> RoutePoints { get; set; } = new();

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}