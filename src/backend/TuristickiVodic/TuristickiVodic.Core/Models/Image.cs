using System;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class Image
    {
        public int Id { get; set; }

        [Required, MaxLength(500)]
        public string Url { get; set; }

        // Accessibility
        [MaxLength(200)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
