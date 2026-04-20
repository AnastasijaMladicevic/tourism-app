using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.Models
{
    public class Image
    {
        public int Id { get; set; }

        [Required, MaxLength(ValidationLengths.ImageUrl)]
        public string Url { get; set; }

        // Accessibility
        [MaxLength(ValidationLengths.ImageAltText)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; } = false;

        // Tacno jedan ce biti popunjen
        public int? ObjectId { get; set; }
        public TouristObject? Object { get; set; }

        public int? ActivityId { get; set; }
        public Activity? Activity { get; set; }

        public int? EventId { get; set; }
        public Event? Event { get; set; }

        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        public int? LocalityId { get; set; }
        public Locality? Locality { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
