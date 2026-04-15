namespace TuristickiVodic.Core.DTO
{
    public class DeletionRequestQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Status { get; set; }
        public string? ContentType { get; set; }
        public string? RequestedBy { get; set; }
        public string? ReviewedBy { get; set; }
        public string? Destination { get; set; }

        public string? SortBy { get; set; } = "createdAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
