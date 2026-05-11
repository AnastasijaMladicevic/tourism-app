using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateLocationShareDto
    {
        [Range(1, 24, ErrorMessage = "Duration must be between 1 and 24 hours.")]
        public int DurationHours { get; set; }
    }
}
