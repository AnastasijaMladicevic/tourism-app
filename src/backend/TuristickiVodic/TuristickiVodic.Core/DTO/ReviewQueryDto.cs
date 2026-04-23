namespace TuristickiVodic.Core.DTO
{
    public class ReviewQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Object { get; set; }
        public string? User { get; set; }
        public int? RegionId { get; set; }
        public int? MinRating { get; set; }
        public int? MaxRating { get; set; }
        public bool? HasResponse { get; set; }
        public string? Status { get; set; }

        public string? SortBy { get; set; } = "createdAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
