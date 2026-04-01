using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateImageDto
    {
        [MaxLength(500)]
        public string? Url { get; set; }

        [MaxLength(200)]
        public string? AltText { get; set; }

        public bool? IsMain { get; set; }

        public int? ObjectId { get; set; }
        public int? ActivityId { get; set; }
        public int? EventId { get; set; }
        public int? DestinationId { get; set; }
        public int? LocationId { get; set; }
    }
}
