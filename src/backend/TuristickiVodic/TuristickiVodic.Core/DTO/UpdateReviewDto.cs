using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateReviewDto
    {
        [Range(1, 5)]
        public int? Rating { get; set; }

        [MaxLength(1000)]
        public string? Text { get; set; }
    }
}
