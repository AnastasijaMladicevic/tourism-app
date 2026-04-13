using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class UserQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Role { get; set; }

        public string? SortBy { get; set; } = "id";
        public string? SortOrder { get; set; } = "asc";
    }
}
