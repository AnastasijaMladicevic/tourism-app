using TuristickiVodic.Core.DTO;
namespace TuristickiVodic.Services
{
    public interface IActivityService
    {
        Task<PagedResultDto<ActivityDto>> GetAllAsync(ActivityQueryDto query);
        Task<PagedResultDto<ActivityDto>> GetNearbyAsync(NearbyActivityQueryDto query);
        Task<PagedResultDto<ActivityDto>> GetMyAsync(int userId, ActivityQueryDto query);
        Task<PagedResultDto<ActivityDto>> GetForManagerAsync(int userId, ActivityQueryDto query);
        Task<ActivityDto?> GetByIdAsync(int id);
        Task<ActivityDto?> GetMineByIdAsync(int id, int userId);
        Task<ActivityDto?> GetForManagerByIdAsync(int id, int userId);
        Task<ActivityDto> CreateAsync(CreateActivityDto dto, int userId, string roleName);
        Task<ActivityDto?> UpdateAsync(int id, UpdateActivityDto dto, int userId, string roleName);
        Task<ActivityDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
        Task<ActivityDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName);
    }
}
