using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class RoutePointDto
    {
        public int Id { get; set; }
        public short Order { get; set; }
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public string? PointName { get; set; }
    }

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