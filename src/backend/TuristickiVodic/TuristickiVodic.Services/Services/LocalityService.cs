using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using NetTopologySuite.Operation.Distance;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.Services
{
    public class LocalityService : ILocalityService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public LocalityService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<LocalityDto>> GetAllAsync()
        {
            var localities = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .OrderBy(l => l.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<LocalityDto>>(localities);
        }

        public async Task<LocalityDto?> GetByIdAsync(int id)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .FirstOrDefaultAsync(l => l.Id == id);

            return locality == null ? null : _mapper.Map<LocalityDto>(locality);
        }

        public async Task<LocalityDto> CreateAsync(CreateLocalityDto dto, int userId, string roleName)
        {
            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == dto.DestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found");

            var localityTypeExists = await _context.LocalityTypes
                .AnyAsync(lt => lt.Id == dto.LocalityTypeId);

            if (!localityTypeExists)
                throw new InvalidOperationException("Locality type not found");

            // Samo menadžer upravlja lokalitetima.
            // Ako je destinacija ostala bez menadžera (izuzetna situacija),
            // odgovornost preuzima menadžer geografski najbliže destinacije – NE admin.
            if (roleName == "Manager")
            {
                var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
                if (!isResponsible)
                    throw new InvalidOperationException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new InvalidOperationException("Admins cannot manage localities directly. The responsible manager handles localities.");
            }

            var locality = new Core.Models.Locality
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                IsActive = dto.IsActive,
                DestinationId = dto.DestinationId,
                LocalityTypeId = dto.LocalityTypeId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Localities.Add(locality);
            await _context.SaveChangesAsync();

            var created = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .FirstAsync(l => l.Id == locality.Id);

            return _mapper.Map<LocalityDto>(created);
        }

        public async Task<LocalityDto?> UpdateAsync(int id, UpdateLocalityDto dto, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (locality == null)
                return null;

            var targetDestinationId = dto.DestinationId ?? locality.DestinationId;

            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == targetDestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found");

            // Samo menadžer može da menja lokalitete.
            // Menadžer može da menja samo lokalitete u svojoj destinaciji.
            // Ako se lokalitet premešta, menadžer mora biti odgovoran i za ciljnu destinaciju.
            if (roleName == "Manager")
            {
                var manager = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (manager == null)
                    throw new InvalidOperationException("User not found");

                if (manager.ManagedDestinationId != locality.DestinationId)
                    throw new InvalidOperationException("You are not the responsible manager for the current destination of this locality.");

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                {
                    if (manager.ManagedDestinationId != dto.DestinationId.Value)
                        throw new InvalidOperationException("You are not the responsible manager for the target destination.");
                }
            }
            else if (roleName == "Admin")
            {
                throw new InvalidOperationException("Admins cannot manage localities directly. The responsible manager handles localities.");
            }

            if (dto.LocalityTypeId.HasValue)
            {
                var localityTypeExists = await _context.LocalityTypes
                    .AnyAsync(lt => lt.Id == dto.LocalityTypeId.Value);

                if (!localityTypeExists)
                    throw new InvalidOperationException("Locality type not found");

                locality.LocalityTypeId = dto.LocalityTypeId.Value;
            }

            if (dto.DestinationId.HasValue)
                locality.DestinationId = dto.DestinationId.Value;

            if (!string.IsNullOrWhiteSpace(dto.Name))
                locality.Name = dto.Name;

            if (dto.Description != null)
                locality.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                locality.Geolocation = CreatePoint(dto.Longitude.Value, dto.Latitude.Value);

            if (dto.IsActive.HasValue)
                locality.IsActive = dto.IsActive.Value;

            locality.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Localities
                .Include(l => l.Destination)
                .Include(l => l.LocalityType)
                .FirstAsync(l => l.Id == locality.Id);

            return _mapper.Map<LocalityDto>(updated);
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var locality = await _context.Localities
                .Include(l => l.Destination)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (locality == null)
                return false;

            // Samo menadžer može da briše lokalitete.
            // Ako je destinacija ostala bez menadžera (izuzetna situacija),
            // odgovornost preuzima menadžer geografski najbliže destinacije – NE admin.
            if (roleName == "Manager")
            {
                if (locality.Destination == null)
                    throw new InvalidOperationException("Cannot determine destination of this locality.");

                var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, locality.Destination, userId);
                if (!isResponsible)
                    throw new InvalidOperationException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new InvalidOperationException("Admins cannot delete localities directly. The responsible manager handles localities.");
            }

            _context.Localities.Remove(locality);
            await _context.SaveChangesAsync();

            return true;
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }
    }
}