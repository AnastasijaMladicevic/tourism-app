using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateLocationDto
    {
        public string? Name { get; set; }

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public int? DestinationId { get; set; }

        public int? LocationTypeId { get; set; }

        public bool? IsActive { get; set; }
    }
}
