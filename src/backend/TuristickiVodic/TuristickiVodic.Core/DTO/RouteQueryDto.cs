namespace TuristickiVodic.Core.DTO
{
    public class RouteQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Difficulty { get; set; }
        public string? CreatedBy { get; set; }
        public decimal? MinLengthKm { get; set; }
        public decimal? MaxLengthKm { get; set; }

        public string? SortBy { get; set; } = "createdAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
