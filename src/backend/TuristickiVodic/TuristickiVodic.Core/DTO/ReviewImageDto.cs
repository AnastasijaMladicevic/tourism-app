using System;

namespace TuristickiVodic.Core.DTO
{
    public class ReviewImageDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? AltText { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
