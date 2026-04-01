using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class RoutePointService : IRoutePointService
    {
        private readonly AppDbContext _context;

        public RoutePointService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<RoutePointDto>> GetByRouteAsync(int routeId)
        {
            var routeExists = await _context.Routes.AnyAsync(r => r.Id == routeId);
            if (!routeExists)
                throw new InvalidOperationException("Route not found.");

            var points = await _context.RoutePoints
                .Where(p => p.RouteId == routeId)
                .OrderBy(p => p.Order)
                .ToListAsync();

            return points.Select(MapToDto);
        }

        public async Task<RoutePointDto?> GetByIdAsync(int id)
        {
            var point = await _context.RoutePoints.FirstOrDefaultAsync(p => p.Id == id);
            return point == null ? null : MapToDto(point);
        }

        // Samo vlasnik rute može da dodaje tačke
        // Order mora biti jedinstven u okviru rute
        public async Task<RoutePointDto> AddAsync(int routeId, CreateRoutePointDto dto, int userId)
        {
            var route = await _context.Routes.FirstOrDefaultAsync(r => r.Id == routeId);

            if (route == null)
                throw new InvalidOperationException("Route not found.");

            if (route.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only add points to your own routes.");

            var orderExists = await _context.RoutePoints
                .AnyAsync(p => p.RouteId == routeId && p.Order == dto.Order);

            if (orderExists)
                throw new InvalidOperationException($"A point with order {dto.Order} already exists on this route.");

            var point = new RoutePoint
            {
                RouteId = routeId,
                Order = dto.Order,
                Geolocation = new Point(dto.Longitude, dto.Latitude) { SRID = 4326 },
                PointName = dto.PointName,
                CreatedAt = DateTime.UtcNow
            };

            _context.RoutePoints.Add(point);

            route.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(point);
        }

        // Samo vlasnik rute može da menja tačku
        // Order mora ostati jedinstven u okviru rute
        public async Task<RoutePointDto?> UpdateAsync(int id, UpdateRoutePointDto dto, int userId)
        {
            var point = await _context.RoutePoints
                .Include(p => p.Route)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (point == null)
                return null;

            if (point.Route.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only update points on your own routes.");

            // Proveri jedinstvenost novog Ordera (ako se menja)
            if (dto.Order.HasValue && dto.Order.Value != point.Order)
            {
                var orderExists = await _context.RoutePoints
                    .AnyAsync(p => p.RouteId == point.RouteId && p.Order == dto.Order.Value);

                if (orderExists)
                    throw new InvalidOperationException($"A point with order {dto.Order.Value} already exists on this route.");

                point.Order = dto.Order.Value;
            }

            // Ažuriraj geolokaciju samo ako su oba koordinata prosleđena
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                point.Geolocation = new Point(dto.Longitude.Value, dto.Latitude.Value) { SRID = 4326 };

            if (dto.PointName != null)
                point.PointName = dto.PointName;

            point.Route.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(point);
        }

        // Samo vlasnik rute može da briše tačku
        // Ruta mora imati minimum 2 tačke nakon brisanja
        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var point = await _context.RoutePoints
                .Include(p => p.Route)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (point == null)
                return false;

            if (point.Route.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can only delete points from your own routes.");

            var pointCount = await _context.RoutePoints
                .CountAsync(p => p.RouteId == point.RouteId);

            if (pointCount <= 2)
                throw new InvalidOperationException("Cannot delete this point. A route must have at least 2 points.");

            _context.RoutePoints.Remove(point);

            point.Route.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        private static RoutePointDto MapToDto(RoutePoint p) => new()
        {
            Id = p.Id,
            RouteId = p.RouteId,
            Order = p.Order,
            Longitude = p.Geolocation.X,
            Latitude = p.Geolocation.Y,
            PointName = p.PointName,
            CreatedAt = p.CreatedAt
        };
    }
}
