using System;
using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.Models
{
    public class ReviewImage
    {
        public int Id { get; set; }

        [Required]
        public int ReviewId { get; set; }
        public Review Review { get; set; } = null!;

        [Required, MaxLength(ValidationLengths.ImageUrl)]
        public string Url { get; set; } = string.Empty;

        [MaxLength(ValidationLengths.ImageAltText)]
        public string? AltText { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
