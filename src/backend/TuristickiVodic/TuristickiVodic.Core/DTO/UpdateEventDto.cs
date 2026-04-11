using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateEventDto
    {
        public string? Name { get; set; }

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }

        public int? MaxVisitors { get; set; }

        public int? EventTypeId { get; set; }

        public int? LocalityId { get; set; }

        public int? DestinationId { get; set; }

        public int? ObjectId { get; set; }
    }
}
