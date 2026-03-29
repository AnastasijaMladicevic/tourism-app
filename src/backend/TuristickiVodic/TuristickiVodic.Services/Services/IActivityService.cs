using TuristickiVodic.Core.DTOs;

namespace TuristickiVodic.Services
{
    public interface IActivityService
    {
        Task<IEnumerable<ActivityDto>> GetAllAsync();
        Task<ActivityDto?> GetByIdAsync(int id);
        Task<ActivityDto> CreateAsync(CreateActivityDto dto, int userId);
        Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto);
        Task<bool> DeleteAsync(int id);
    }
}