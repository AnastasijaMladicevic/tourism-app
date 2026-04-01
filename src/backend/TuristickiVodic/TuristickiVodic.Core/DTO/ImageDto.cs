using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class ImageDto
    {
        public int Id { get; set; }
        public string Url { get; set; }
        public string? AltText { get; set; }
        public bool IsMain { get; set; }

        public int? ObjectId { get; set; }
        public int? ActivityId { get; set; }
        public int? EventId { get; set; }
        public int? DestinationId { get; set; }
        public int? LocationId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
