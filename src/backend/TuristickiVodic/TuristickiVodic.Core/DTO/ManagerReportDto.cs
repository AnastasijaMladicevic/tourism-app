namespace TuristickiVodic.Core.DTO
{
    public class ManagerReportDto
    {
        public int Id { get; set; }
        public int ManagerId { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public string DestinationName { get; set; } = string.Empty;
        public int ReportedUserId { get; set; }
        public string ReportedUserName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? ResolvedByUserId { get; set; }
        public string? ResolvedByName { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
