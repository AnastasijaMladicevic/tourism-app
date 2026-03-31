namespace TuristickiVodic.Core.DTO
{
    public class CreateDeletionRequestDto
    {
        public string? Reason { get; set; }
    }

    public class ApproveDeletionRequestDto
    {
        public bool Approve { get; set; }
        public string? RejectionReason { get; set; }
    }

    public class DeletionRequestDto
    {
        public int Id { get; set; }
        public int ObjectId { get; set; }
        public string ObjectName { get; set; }
        public int RequestedByUserId { get; set; }
        public string RequestedByName { get; set; }
        public string? Reason { get; set; }
        public string Status { get; set; }
        public int? ReviewedByUserId { get; set; }
        public string? ReviewedByName { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
