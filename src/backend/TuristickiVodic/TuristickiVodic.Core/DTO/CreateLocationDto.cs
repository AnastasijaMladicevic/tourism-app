using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class CreateLocationDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        [Required]
        public int DestinationId { get; set; }

        [Required]
        public int LocationTypeId { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
