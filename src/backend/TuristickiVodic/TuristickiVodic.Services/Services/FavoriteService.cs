using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class FavoriteService : IFavoriteService
    {
        private readonly AppDbContext _context;

        public FavoriteService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResultDto<FavoriteDto>> GetMyFavoritesAsync(int userId, FavoriteQueryDto query)
        {
            NormalizeQuery(query);

            var favoritesQuery = _context.Favorites
                .Include(f => f.Object)
                .Include(f => f.Activity)
                .Include(f => f.Destination)
                .Include(f => f.Route)
                .Include(f => f.Locality)
                .Where(f => f.UserId == userId)
                .AsQueryable();

            favoritesQuery = ApplyFilters(favoritesQuery, query);
            favoritesQuery = ApplySorting(favoritesQuery, query.SortBy, query.SortOrder);

            var totalCount = await favoritesQuery.CountAsync();

            var favorites = await favoritesQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<FavoriteDto>
            {
                Items = favorites.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<FavoriteDto> AddAsync(CreateFavoriteDto dto, int userId)
        {
            int filledCount = (dto.ObjectId.HasValue ? 1 : 0)
                            + (dto.ActivityId.HasValue ? 1 : 0)
                            + (dto.DestinationId.HasValue ? 1 : 0)
                            + (dto.RouteId.HasValue ? 1 : 0)
                            + (dto.LocalityId.HasValue ? 1 : 0);

            // Mora biti naveden tačno jedan od: ObjectId, DestinationId, LocalityId, ActivityId, RouteId
            if (filledCount != 1)
                throw new InvalidOperationException("Exactly one of ObjectId, ActivityId, DestinationId, RouteId or LocationId must be provided.");

            if (dto.ObjectId.HasValue && !await _context.Objects.AnyAsync(o => o.Id == dto.ObjectId.Value))
                throw new InvalidOperationException("Object not found.");

            if (dto.ActivityId.HasValue && !await _context.Activities.AnyAsync(a => a.Id == dto.ActivityId.Value))
                throw new InvalidOperationException("Activity not found.");

            if (dto.DestinationId.HasValue && !await _context.Destinations.AnyAsync(d => d.Id == dto.DestinationId.Value))
                throw new InvalidOperationException("Destination not found.");

            if (dto.RouteId.HasValue && !await _context.Routes.AnyAsync(r => r.Id == dto.RouteId.Value))
                throw new InvalidOperationException("Route not found.");

            if (dto.LocalityId.HasValue && !await _context.Localities.AnyAsync(l => l.Id == dto.LocalityId.Value))
                throw new InvalidOperationException("Locality not found.");

            var alreadyExists = await _context.Favorites.AnyAsync(f =>
                f.UserId == userId &&
                f.ObjectId == dto.ObjectId &&
                f.ActivityId == dto.ActivityId &&
                f.DestinationId == dto.DestinationId &&
                f.RouteId == dto.RouteId &&
                f.LocalityId == dto.LocalityId);

            if (alreadyExists)
                throw new InvalidOperationException("This item is already in your favorites.");

            var favorite = new Favorite
            {
                UserId = userId,
                ObjectId = dto.ObjectId,
                ActivityId = dto.ActivityId,
                DestinationId = dto.DestinationId,
                RouteId = dto.RouteId,
                LocalityId = dto.LocalityId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Favorites.Add(favorite);
            await _context.SaveChangesAsync();

            var created = await _context.Favorites
                .Include(f => f.Object)
                .Include(f => f.Activity)
                .Include(f => f.Destination)
                .Include(f => f.Route)
                .Include(f => f.Locality)
                .FirstAsync(f => f.Id == favorite.Id);

            return MapToDto(created);
        }

        public async Task<bool> RemoveAsync(int id, int userId)
        {
            var favorite = await _context.Favorites
                .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

            if (favorite == null)
                return false;

            _context.Favorites.Remove(favorite);
            await _context.SaveChangesAsync();

            return true;
        }

        private static void NormalizeQuery(FavoriteQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;
        }

        private static IQueryable<Favorite> ApplyFilters(IQueryable<Favorite> query, FavoriteQueryDto filters)
        {
            if (!string.IsNullOrWhiteSpace(filters.Search))
            {
                var search = filters.Search.Trim().ToLower();

                query = query.Where(f =>
                    (f.Object != null && f.Object.Name.ToLower().Contains(search)) ||
                    (f.Activity != null && f.Activity.Name.ToLower().Contains(search)) ||
                    (f.Destination != null && f.Destination.Name.ToLower().Contains(search)) ||
                    (f.Route != null && f.Route.Name.ToLower().Contains(search)) ||
                    (f.Locality != null && f.Locality.Name.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(filters.Type))
            {
                var type = filters.Type.Trim().ToLower();

                if (type == "object")
                    query = query.Where(f => f.ObjectId != null);
                else if (type == "activity")
                    query = query.Where(f => f.ActivityId != null);
                else if (type == "destination")
                    query = query.Where(f => f.DestinationId != null);
                else if (type == "route")
                    query = query.Where(f => f.RouteId != null);
                else if (type == "locality")
                    query = query.Where(f => f.LocalityId != null);
                else
                    query = query.Where(_ => false);
            }

            return query;
        }

        private static IQueryable<Favorite> ApplySorting(IQueryable<Favorite> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "name")
            {
                return isDesc
                    ? query.OrderByDescending(f =>
                        f.Object != null ? f.Object.Name :
                        f.Activity != null ? f.Activity.Name :
                        f.Destination != null ? f.Destination.Name :
                        f.Route != null ? f.Route.Name :
                        f.Locality != null ? f.Locality.Name :
                        string.Empty)
                    : query.OrderBy(f =>
                        f.Object != null ? f.Object.Name :
                        f.Activity != null ? f.Activity.Name :
                        f.Destination != null ? f.Destination.Name :
                        f.Route != null ? f.Route.Name :
                        f.Locality != null ? f.Locality.Name :
                        string.Empty);
            }

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(f =>
                        f.ObjectId != null ? "Object" :
                        f.ActivityId != null ? "Activity" :
                        f.DestinationId != null ? "Destination" :
                        f.RouteId != null ? "Route" :
                        f.LocalityId != null ? "Locality" :
                        string.Empty)
                    : query.OrderBy(f =>
                        f.ObjectId != null ? "Object" :
                        f.ActivityId != null ? "Activity" :
                        f.DestinationId != null ? "Destination" :
                        f.RouteId != null ? "Route" :
                        f.LocalityId != null ? "Locality" :
                        string.Empty);
            }

            return isDesc
                ? query.OrderByDescending(f => f.CreatedAt)
                : query.OrderBy(f => f.CreatedAt);
        }

        private static FavoriteDto MapToDto(Favorite favorite)
        {
            return new FavoriteDto
            {
                Id = favorite.Id,
                UserId = favorite.UserId,
                ObjectId = favorite.ObjectId,
                ObjectName = favorite.Object?.Name,
                ActivityId = favorite.ActivityId,
                ActivityName = favorite.Activity?.Name,
                DestinationId = favorite.DestinationId,
                DestinationName = favorite.Destination?.Name,
                RouteId = favorite.RouteId,
                RouteName = favorite.Route?.Name,
                LocalityId = favorite.LocalityId,
                LocalityName = favorite.Locality?.Name,
                CreatedAt = favorite.CreatedAt
            };
        }
    }
}
