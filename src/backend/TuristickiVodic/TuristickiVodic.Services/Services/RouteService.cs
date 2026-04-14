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

        public async Task<PagedResultDto<RouteDto>> GetAllAsync(RouteQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var routesQuery = _context.Routes
                .Include(r => r.RoutePoints)
                .Include(r => r.CreatedBy)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                routesQuery = routesQuery.Where(r =>
                    r.Name.ToLower().Contains(search) ||
                    (r.Description != null && r.Description.ToLower().Contains(search)) ||
                    r.RoutePoints.Any(p => p.PointName != null && p.PointName.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(query.Difficulty))
            {
                var difficulty = query.Difficulty.Trim().ToLower();

                routesQuery = routesQuery.Where(r =>
                    r.Difficulty != null &&
                    r.Difficulty.ToLower().Contains(difficulty));
            }

            if (!string.IsNullOrWhiteSpace(query.CreatedBy))
            {
                var createdBy = query.CreatedBy.Trim().ToLower();

                routesQuery = routesQuery.Where(r =>
                    r.CreatedBy != null && (
                        r.CreatedBy.FirstName.ToLower().Contains(createdBy) ||
                        r.CreatedBy.LastName.ToLower().Contains(createdBy) ||
                        (r.CreatedBy.FirstName + " " + r.CreatedBy.LastName).ToLower().Contains(createdBy)));
            }

            if (query.MinLengthKm.HasValue)
            {
                routesQuery = routesQuery.Where(r =>
                    r.LengthKm.HasValue &&
                    r.LengthKm.Value >= query.MinLengthKm.Value);
            }

            if (query.MaxLengthKm.HasValue)
            {
                routesQuery = routesQuery.Where(r =>
                    r.LengthKm.HasValue &&
                    r.LengthKm.Value <= query.MaxLengthKm.Value);
            }

            routesQuery = ApplyRouteSorting(routesQuery, query.SortBy, query.SortOrder);

            var totalCount = await routesQuery.CountAsync();

            var routes = await routesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<RouteDto>
            {
                Items = routes.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
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

        private static IQueryable<Route> ApplyRouteSorting(IQueryable<Route> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "name")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Name)
                    : query.OrderBy(r => r.Name);
            }

            if (sortByValue == "difficulty")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Difficulty)
                    : query.OrderBy(r => r.Difficulty);
            }

            if (sortByValue == "length" || sortByValue == "lengthkm")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.LengthKm)
                    : query.OrderBy(r => r.LengthKm);
            }

            if (sortByValue == "createdby")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.CreatedBy != null ? r.CreatedBy.FirstName : string.Empty)
                        .ThenByDescending(r => r.CreatedBy != null ? r.CreatedBy.LastName : string.Empty)
                    : query.OrderBy(r => r.CreatedBy != null ? r.CreatedBy.FirstName : string.Empty)
                        .ThenBy(r => r.CreatedBy != null ? r.CreatedBy.LastName : string.Empty);
            }

            return isDesc
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt);
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
