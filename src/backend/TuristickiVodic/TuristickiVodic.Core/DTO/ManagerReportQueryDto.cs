namespace TuristickiVodic.Core.DTO
{
    public class ManagerReportQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Status { get; set; }
        public string? Manager { get; set; }
        public string? ReportedUser { get; set; }
        public string? Destination { get; set; }

        public string? SortBy { get; set; } = "createdAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
