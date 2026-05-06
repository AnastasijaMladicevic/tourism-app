using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.API.DTO
{
    public class UploadReviewImagesDto
    {
        [Required]
        public List<IFormFile> Files { get; set; } = new();
    }
}
