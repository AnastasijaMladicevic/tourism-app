namespace TuristickiVodic.Core.DTO
{
    public class EventPlannerQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Destination { get; set; }
        public string? Locality { get; set; }
        public string? EventType { get; set; }
        public string? Status { get; set; }
        public bool? IsActive { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        public string? SortBy { get; set; } = "startDate";
        public string? SortOrder { get; set; } = "asc";
    }
}
