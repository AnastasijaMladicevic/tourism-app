using System;
using System.Collections.Generic;
using System.Text;
using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class CreateImageDto
    {
        [Required, MaxLength(ValidationLengths.ImageUrl)]
        public string Url { get; set; }

        [MaxLength(ValidationLengths.ImageAltText)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; }

        public int? ObjectId { get; set; }
        public int? ActivityId { get; set; }
        public int? EventId { get; set; }
        public int? DestinationId { get; set; }
        public int? LocalityId { get; set; }
    }
}
