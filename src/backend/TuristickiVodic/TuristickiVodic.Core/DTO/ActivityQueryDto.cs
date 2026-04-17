using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class ActivityQueryDto
    {
        public string? Type { get; set; }
        public string? Destination { get; set; }
        public string? Status { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }

        public string? SortBy { get; set; } = "name";
        public string? SortOrder { get; set; } = "asc";
    }
}
