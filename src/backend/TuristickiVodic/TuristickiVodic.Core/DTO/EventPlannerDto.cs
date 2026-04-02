using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class EventPlannerDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int EventId { get; set; }
        public string EventName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int EventTypeId { get; set; }
        public string EventTypeName { get; set; } = string.Empty;
        public int? LocalityId { get; set; }
        public string? LocalityName { get; set; }
        public int? DestinationId { get; set; }
        public string? DestinationName { get; set; }
        public int? ObjectId { get; set; }
        public string? ObjectName { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime AddedAt { get; set; }
    }

    public class CreateEventPlannerDto
    {
        [Range(1, int.MaxValue)]
        public int EventId { get; set; }
    }
}
