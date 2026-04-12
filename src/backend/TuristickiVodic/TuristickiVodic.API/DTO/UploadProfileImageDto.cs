using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UploadProfileImageDto
    {
        [Required]
        public IFormFile File { get; set; } = null!;
    }
}