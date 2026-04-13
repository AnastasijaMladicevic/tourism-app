using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateLocalityDto
    {
        public string? Name { get; set; }

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public int? DestinationId { get; set; }

        public int? LocalityTypeId { get; set; }
    }
}
