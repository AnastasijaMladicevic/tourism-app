namespace TuristickiVodic.Core.DTO
{
    public class EventQueryDto
    {
        public string? Type { get; set; }
        public string? Destination { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }

        public string? SortBy { get; set; } = "startDate";
        public string? SortOrder { get; set; } = "asc";
    }
}