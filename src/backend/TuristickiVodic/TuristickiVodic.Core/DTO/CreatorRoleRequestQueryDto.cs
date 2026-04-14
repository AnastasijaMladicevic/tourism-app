namespace TuristickiVodic.Core.DTO
{
    public class CreatorRoleRequestQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsVerified { get; set; }

        public string? SortBy { get; set; } = "createdAt";
        public string? SortOrder { get; set; } = "desc";
    }
}
