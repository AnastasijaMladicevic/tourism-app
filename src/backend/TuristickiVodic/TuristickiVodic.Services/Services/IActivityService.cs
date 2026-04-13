using TuristickiVodic.Core.DTO;
namespace TuristickiVodic.Services
{
    public interface IActivityService
    {
        Task<IEnumerable<ActivityDto>> GetAllAsync();
        Task<ActivityDto?> GetByIdAsync(int id);
        Task<ActivityDto> CreateAsync(CreateActivityDto dto, int userId, string roleName);
        Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto, int userId, string roleName);
        Task<ActivityDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
        Task<ActivityDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName);
        Task<PagedResultDto<ActivityDto>> SearchAsync(ActivityQueryDto query);
    }
}
