namespace TuristickiVodic.Core.DTO
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? ActionUrl { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public int? EventId { get; set; }
        public int? ReviewId { get; set; }
        public int? EventPlannerItemId { get; set; }
        public DateTime? TriggerAtUtc { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class NotificationQueryDto
    {
        public bool? IsRead { get; set; }
        public string? Type { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class NotificationUnreadCountDto
    {
        public int UnreadCount { get; set; }
    }
}
