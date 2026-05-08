using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IReviewImageService
    {
        Task<List<ReviewImageDto>> GetForReviewAsync(int reviewId);
        Task<List<ReviewImageDto>> AddAsync(int reviewId, IEnumerable<IFormFile> files, int userId, string roleName);
        Task<bool> DeleteAsync(int reviewId, int imageId, int userId, string roleName);
    }
}
