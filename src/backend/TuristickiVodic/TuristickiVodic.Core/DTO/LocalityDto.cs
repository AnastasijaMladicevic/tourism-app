using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class LocalityDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public bool IsActive { get; set; }

        public int DestinationId { get; set; }

        public string DestinationName { get; set; } = string.Empty;

        public int LocalityTypeId { get; set; }

        public string LocalityTypeName { get; set; } = string.Empty;

        public int? CreatedByUserId { get; set; }

        public int? ImageId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
