using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IRouteService
    {
        Task<IEnumerable<RouteDto>> GetAllAsync();
        Task<RouteDto?> GetByIdAsync(int id);
        Task<RouteDto> CreateAsync(CreateRouteDto dto, int userId);
        Task<RouteDto?> UpdateAsync(int id, UpdateRouteDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}