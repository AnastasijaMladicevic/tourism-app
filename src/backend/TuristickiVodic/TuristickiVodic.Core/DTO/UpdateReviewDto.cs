using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateReviewDto
    {
        [Range(1, 5)]
        public int? Rating { get; set; }

        [MaxLength(1000)]
        public string? Text { get; set; }
    }

    public class RespondToReviewDto
    {
        [Required]
        [MaxLength(1000)]
        public string CreatorResponse { get; set; } = string.Empty;
    }

    public class ApproveReviewDto
    {
        [Required]
        public bool Approve { get; set; }

        public string? RejectionReason { get; set; }
    }
}
