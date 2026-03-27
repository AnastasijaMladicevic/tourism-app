using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

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

        // Tacno jedan ce biti popunjen
        public int? ObjectId { get; set; }
        public TouristObject? Object { get; set; }

        public int? ActivityId { get; set; }
        public Activity? Activity { get; set; }

        public int? EventId { get; set; }
        public Event? Event { get; set; }

        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        public int? LocationId { get; set; }
        public Location? Location { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
