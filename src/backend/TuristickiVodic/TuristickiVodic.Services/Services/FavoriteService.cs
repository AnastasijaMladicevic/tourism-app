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
                .Include(f => f.Destination)
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return favorites.Select(f => new FavoriteDto
            {
                Id = f.Id,
                UserId = f.UserId,
                ObjectId = f.ObjectId,
                ObjectName = f.Object?.Name,
                DestinationId = f.DestinationId,
                DestinationName = f.Destination?.Name,
                RouteId = f.RouteId,
                CreatedAt = f.CreatedAt
            });
        }

        public async Task<FavoriteDto> AddAsync(CreateFavoriteDto dto, int userId)
        {
            // Mora biti naveden tačno jedan od: ObjectId, DestinationId, RouteId
            int filledCount = (dto.ObjectId.HasValue ? 1 : 0)
                            + (dto.DestinationId.HasValue ? 1 : 0)
                            + (dto.RouteId.HasValue ? 1 : 0);

            if (filledCount != 1)
                throw new InvalidOperationException("Exactly one of ObjectId, DestinationId or RouteId must be provided.");

            // Proveri da li stavka postoji
            if (dto.ObjectId.HasValue && !await _context.Objects.AnyAsync(o => o.Id == dto.ObjectId.Value))
                throw new InvalidOperationException("Object not found.");

            if (dto.DestinationId.HasValue && !await _context.Destinations.AnyAsync(d => d.Id == dto.DestinationId.Value))
                throw new InvalidOperationException("Destination not found.");

            if (dto.RouteId.HasValue && !await _context.Routes.AnyAsync(r => r.Id == dto.RouteId.Value))
                throw new InvalidOperationException("Route not found.");

            // Proveri duplikat
            var alreadyExists = await _context.Favorites.AnyAsync(f =>
                f.UserId == userId &&
                f.ObjectId == dto.ObjectId &&
                f.DestinationId == dto.DestinationId &&
                f.RouteId == dto.RouteId);

            if (alreadyExists)
                throw new InvalidOperationException("This item is already in your favorites.");

            var favorite = new Favorite
            {
                UserId = userId,
                ObjectId = dto.ObjectId,
                DestinationId = dto.DestinationId,
                RouteId = dto.RouteId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Favorites.Add(favorite);
            await _context.SaveChangesAsync();

            // Učitaj sa navigacijama
            var created = await _context.Favorites
                .Include(f => f.Object)
                .Include(f => f.Destination)
                .FirstAsync(f => f.Id == favorite.Id);

            return new FavoriteDto
            {
                Id = created.Id,
                UserId = created.UserId,
                ObjectId = created.ObjectId,
                ObjectName = created.Object?.Name,
                DestinationId = created.DestinationId,
                DestinationName = created.Destination?.Name,
                RouteId = created.RouteId,
                CreatedAt = created.CreatedAt
            };
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
    }
}
