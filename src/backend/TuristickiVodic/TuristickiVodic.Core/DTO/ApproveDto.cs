using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class ApproveContentDto
    {
        [Required]
        public bool Approve { get; set; }

        public string? RejectionReason { get; set; }
    }
}
