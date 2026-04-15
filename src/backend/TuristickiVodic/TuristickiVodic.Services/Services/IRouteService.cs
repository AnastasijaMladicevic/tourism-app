using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IRouteService
    {
        Task<PagedResultDto<RouteDto>> GetAllAsync(RouteQueryDto query);
        Task<RouteDto?> GetByIdAsync(int id);
        Task<RouteDto> CreateAsync(CreateRouteDto dto, int userId);
        Task<RouteDto?> UpdateAsync(int id, UpdateRouteDto dto, int userId);
        Task<bool> DeleteAsync(int id, int userId);
    }
}
