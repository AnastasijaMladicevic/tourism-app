using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateManagerReportDto
    {
        [Range(1, int.MaxValue)]
        public int ReportedUserId { get; set; }

        [Required]
        public string Reason { get; set; } = string.Empty;
    }
}