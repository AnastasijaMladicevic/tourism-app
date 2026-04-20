using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateImageDto
    {
        [MaxLength(ValidationLengths.ImageUrl)]
        public string? Url { get; set; }

        [MaxLength(ValidationLengths.ImageAltText)]
        public string? AltText { get; set; }

        public bool? IsMain { get; set; }
    }
}
