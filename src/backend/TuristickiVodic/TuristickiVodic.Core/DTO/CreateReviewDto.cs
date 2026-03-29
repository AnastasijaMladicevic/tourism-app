using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class CreateReviewDto
    {
        [Required]
        public int ObjectId { get; set; }

        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Text { get; set; } = string.Empty;
    }
}
