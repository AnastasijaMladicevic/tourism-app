using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IRoutePointService
    {
        // Sve tačke za određenu rutu
        Task<IEnumerable<RoutePointDto>> GetByRouteAsync(int routeId);

        // Jedna tačka
        Task<RoutePointDto?> GetByIdAsync(int id);

        // Samo vlasnik rute može da dodaje tačke
        // Order mora biti jedinstven u okviru rute
        Task<RoutePointDto> AddAsync(int routeId, CreateRoutePointDto dto, int userId);

        // Samo vlasnik rute može da menja tačku
        // Order mora ostati jedinstven
        Task<RoutePointDto?> UpdateAsync(int id, UpdateRoutePointDto dto, int userId);

        // Samo vlasnik rute može da briše tačku
        // Ruta mora imati minimum 2 tačke — ne može se obrisati ako bi ostala samo jedna
        Task<bool> DeleteAsync(int id, int userId);
    }
}
