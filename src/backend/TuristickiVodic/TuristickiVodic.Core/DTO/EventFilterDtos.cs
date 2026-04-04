namespace TuristickiVodic.Core.DTO
{
    public class EventFilterDto
    {
        public DateTime? Date { get; set; }
        public int? NextDays { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}