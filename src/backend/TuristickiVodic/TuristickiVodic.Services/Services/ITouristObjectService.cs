using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface ITouristObjectService
    {
        Task<IEnumerable<TouristObjectDto>> GetAllAsync();
        Task<TouristObjectDto?> GetByIdAsync(int id);
        Task<TouristObjectDto> CreateAsync(CreateTouristObjectDto dto, int userId, string roleName);
        Task<TouristObjectDto?> UpdateAsync(int id, UpdateTouristObjectDto dto, int userId, string roleName);
        Task<TouristObjectDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}
