using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateImageDto
    {
        [Required, MaxLength(500)]
        public string Url { get; set; }

        [MaxLength(200)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; }
    }
}
