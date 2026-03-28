using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class LocationDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public bool IsActive { get; set; }

        public int DestinationId { get; set; }

        public string DestinationName { get; set; } = string.Empty;

        public int LocationTypeId { get; set; }

        public string LocationTypeName { get; set; } = string.Empty;

        public int? CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
