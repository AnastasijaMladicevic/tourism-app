using System;

namespace TuristickiVodic.Core.DTO
{
    public class ImageDto
    {
        public int Id { get; set; }
        public string Url { get; set; }
        public string? AltText { get; set; }
        public bool IsMain { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
