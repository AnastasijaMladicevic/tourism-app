using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class CreateEventDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }

        public int? MaxVisitors { get; set; }

        [Required]
        public int EventTypeId { get; set; }

        public int? LocationId { get; set; }

        public int? DestinationId { get; set; }

        public int? ObjectId { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
