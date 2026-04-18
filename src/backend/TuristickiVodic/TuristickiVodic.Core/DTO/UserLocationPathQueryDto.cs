using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UserLocationPathQueryDto
    {
        public DateTime? FromUtc { get; set; }
        public DateTime? ToUtc { get; set; }

        [Range(1, 2000)]
        public int MaxPoints { get; set; } = 500;
    }
}
