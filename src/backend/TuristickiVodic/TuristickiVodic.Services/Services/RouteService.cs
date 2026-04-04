using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class RouteService : IRouteService
    {
        private readonly AppDbContext _context;

        public RouteService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<RouteDto>> GetAllAsync()
        {
            var routes = await _context.Routes
                .Include(r => r.RoutePoints)
                .Include(r => r.CreatedBy)
                .OrderBy(r => r.Id)
                .ToListAsync();

            return routes.Select(MapToDto);
        }

        public async Task<RouteDto?> GetByIdAsync(int id)
        {
            var route = await LoadRouteAsync(id);
            return route == null ? null : MapToDto(route);
        }

        // Svaki ulogovani korisnik može da kreira rutu (turista, CC, menadžer, admin)
        // Ruta mora imati minimum 2 tačke
        public async Task<RouteDto> CreateAsync(CreateRouteDto dto, int userId)
        {
            if (dto.RoutePoints == null || dto.RoutePoints.Count < 2)
                throw new InvalidOperationException("A route must have at least 2 points.");

            // Redosled tačaka mora biti jedinstven
            var duplicateOrders = dto.RoutePoints
                .GroupBy(p => p.Order)
                .Any(g => g.Count() > 1);

            if (duplicateOrders)
                throw new InvalidOperationException("Route points must have unique order values.");

            var route = new Route
            {
                Name = dto.Name,
                Description = dto.Description,
                Difficulty = dto.Difficulty,
                LengthKm = dto.LengthKm,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            foreach (var point in dto.RoutePoints)
            {
                _context.RoutePoints.Add(new RoutePoint
                {
                    RouteId = route.Id,
                    Order = point.Order,
                    Geolocation = new Point(point.Longitude, point.Latitude) { SRID = 4326 },
                    PointName = point.PointName,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return MapToDto(await LoadRouteAsync(route.Id));
        }

        // Samo vlasnik rute može da je menja
        public async Task<RouteDto?> UpdateAsync(int id, UpdateRouteDto dto, int userId)
        {
            var route = await LoadRouteAsync(id);
            if (route == null) return null;

            if (route.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update your own routes.");

            if (!string.IsNullOrWhiteSpace(dto.Name)) route.Name = dto.Name;
            if (dto.Description != null) route.Description = dto.Description;
            if (dto.Difficulty != null) route.Difficulty = dto.Difficulty;
            if (dto.LengthKm.HasValue) route.LengthKm = dto.LengthKm.Value;

            // Ako su prosleđene nove tačke, zamenjuju sve stare
            if (dto.RoutePoints != null)
            {
                if (dto.RoutePoints.Count < 2)
                    throw new InvalidOperationException("A route must have at least 2 points.");

                var duplicateOrders = dto.RoutePoints
                    .GroupBy(p => p.Order)
                    .Any(g => g.Count() > 1);

                if (duplicateOrders)
                    throw new InvalidOperationException("Route points must have unique order values.");

                // Obriši stare tačke i dodaj nove
                var oldPoints = await _context.RoutePoints
                    .Where(p => p.RouteId == id)
                    .ToListAsync();

                _context.RoutePoints.RemoveRange(oldPoints);

                foreach (var point in dto.RoutePoints)
                {
                    _context.RoutePoints.Add(new RoutePoint
                    {
                        RouteId = route.Id,
                        Order = point.Order,
                        Geolocation = new Point(point.Longitude, point.Latitude) { SRID = 4326 },
                        PointName = point.PointName,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            route.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToDto(await LoadRouteAsync(route.Id));
        }

        // Samo vlasnik može da obriše rutu
        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var route = await _context.Routes
                .Include(r => r.Favorites)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route == null) return false;

            if (route.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only delete your own routes.");

            if (route.Favorites.Any())
                throw new InvalidOperationException("Cannot delete a route that is in someone's favorites.");

            _context.Routes.Remove(route);
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task<Route> LoadRouteAsync(int id)
        {
            return await _context.Routes
                .Include(r => r.RoutePoints)
                .Include(r => r.CreatedBy)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        private static RouteDto MapToDto(Route r) => new()
        {
            Id = r.Id,
            Name = r.Name,
            Description = r.Description,
            Difficulty = r.Difficulty,
            LengthKm = r.LengthKm,
            CreatedByUserId = r.CreatedByUserId,
            CreatedByFullName = r.CreatedBy != null
                ? $"{r.CreatedBy.FirstName} {r.CreatedBy.LastName}"
                : null,
            RoutePoints = r.RoutePoints?
                .OrderBy(p => p.Order)
                .Select(p => new RoutePointDto
                {
                    Id = p.Id,
                    Order = p.Order,
                    Longitude = p.Geolocation.X,
                    Latitude = p.Geolocation.Y,
                    PointName = p.PointName
                }).ToList() ?? new(),
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        };
    }
}