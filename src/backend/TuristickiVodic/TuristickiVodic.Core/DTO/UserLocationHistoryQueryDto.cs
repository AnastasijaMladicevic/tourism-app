using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UserLocationHistoryQueryDto
    {
        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 1000)]
        public int PageSize { get; set; } = 100;

        public DateTime? FromUtc { get; set; }
        public DateTime? ToUtc { get; set; }
        public string? SortOrder { get; set; } = "desc";
    }
}
