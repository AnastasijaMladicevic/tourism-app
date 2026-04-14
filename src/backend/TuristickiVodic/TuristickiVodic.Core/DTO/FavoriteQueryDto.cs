namespace TuristickiVodic.Core.DTO
{
    public class FavoriteQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Type { get; set; }

        public string? SortBy { get; set; } = "createdAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
