using System;
using System.Collections.Generic;
using System.Text;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IReviewService
    {
        Task<IEnumerable<ReviewDto>> GetAllAsync();
        Task<ReviewDto?> GetByIdAsync(int id);
        Task<ReviewDto> CreateAsync(CreateReviewDto dto, int userId);
        Task<ReviewDto?> UpdateAsync(int id, UpdateReviewDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}
