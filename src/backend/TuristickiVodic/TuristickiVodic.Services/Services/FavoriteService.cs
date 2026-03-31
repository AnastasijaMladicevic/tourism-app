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

        public async Task<IEnumerable<FavoriteDto>> GetMyFavoritesAsync(int userId)
        {
            var favorites = await _context.Favorites
                .Include(f => f.Object)
                .Include(f => f.Activity)
                .Include(f => f.Destination)
                .Include(f => f.Route)
                .Include(f => f.Location)
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return favorites.Select(MapToDto);
        }

        public async Task<FavoriteDto> AddAsync(CreateFavoriteDto dto, int userId)
        {
            int filledCount = (dto.ObjectId.HasValue ? 1 : 0)
                            + (dto.ActivityId.HasValue ? 1 : 0)
                            + (dto.DestinationId.HasValue ? 1 : 0)
                            + (dto.RouteId.HasValue ? 1 : 0)
                            + (dto.LocationId.HasValue ? 1 : 0);

            // Mora biti naveden tačno jedan od: ObjectId, DestinationId, LocationId, ActivityId, RouteId
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

            if (dto.LocationId.HasValue && !await _context.Locations.AnyAsync(l => l.Id == dto.LocationId.Value))
                throw new InvalidOperationException("Location not found.");

            var alreadyExists = await _context.Favorites.AnyAsync(f =>
                f.UserId == userId &&
                f.ObjectId == dto.ObjectId &&
                f.ActivityId == dto.ActivityId &&
                f.DestinationId == dto.DestinationId &&
                f.RouteId == dto.RouteId &&
                f.LocationId == dto.LocationId);

            // Proveri duplikat
            if (alreadyExists)
                throw new InvalidOperationException("This item is already in your favorites.");

            var favorite = new Favorite
            {
                UserId = userId,
                ObjectId = dto.ObjectId,
                ActivityId = dto.ActivityId,
                DestinationId = dto.DestinationId,
                RouteId = dto.RouteId,
                LocationId = dto.LocationId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Favorites.Add(favorite);
            await _context.SaveChangesAsync();

            var created = await _context.Favorites
                .Include(f => f.Object)
                .Include(f => f.Activity)
                .Include(f => f.Destination)
                .Include(f => f.Route)
                .Include(f => f.Location)
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
                LocationId = favorite.LocationId,
                LocationName = favorite.Location?.Name,
                CreatedAt = favorite.CreatedAt
            };
        }
    }
}
