using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface ITouristObjectService
    {
        Task<PagedResultDto<TouristObjectDto>> GetAllAsync(TouristObjectQueryDto query);
        Task<PagedResultDto<TouristObjectDto>> GetMyAsync(int userId, TouristObjectQueryDto query);
        Task<PagedResultDto<TouristObjectDto>> GetForManagerAsync(int userId, TouristObjectQueryDto query);
        Task<PagedResultDto<TouristObjectDto>> SearchAsync(TouristObjectQueryDto query);
        Task<TouristObjectDto?> GetByIdAsync(int id);
        Task<TouristObjectDto?> GetMineByIdAsync(int id, int userId);
        Task<TouristObjectDto?> GetForManagerByIdAsync(int id, int userId);
        Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName);
        Task<TouristObjectDto?> UpdateAsync(int id, UpdateTouristObjectDto dto, int userId, string roleName);
        Task<TouristObjectDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
        Task<TouristObjectDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName);
    }
}
