using System;
using System.Collections.Generic;
using System.Text;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateImageDto
    {
        [Required, MaxLength(500)]
        public string Url { get; set; }

        [MaxLength(200)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; }

        public int? ObjectId { get; set; }
        public int? ActivityId { get; set; }
        public int? EventId { get; set; }
        public int? DestinationId { get; set; }
        public int? LocalityId { get; set; }
    }
}
