using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class AssignManagerDto
    {
        [Required]
        public int ManagerUserId { get; set; }
    }
}
