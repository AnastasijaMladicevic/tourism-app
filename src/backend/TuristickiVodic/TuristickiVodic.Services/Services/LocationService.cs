using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.Services
{
    public class LocationService : ILocationService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public LocationService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<LocationDto>> GetAllAsync()
        {
            var locations = await _context.Locations
                .Include(l => l.Destination)
                .Include(l => l.LocationType)
                .OrderBy(l => l.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<LocationDto>>(locations);
        }

        public async Task<LocationDto?> GetByIdAsync(int id)
        {
            var location = await _context.Locations
                .Include(l => l.Destination)
                .Include(l => l.LocationType)
                .FirstOrDefaultAsync(l => l.Id == id);

            return location == null ? null : _mapper.Map<LocationDto>(location);
        }

        public async Task<LocationDto> CreateAsync(CreateLocationDto dto, int userId, string roleName)
        {
            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == dto.DestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found");

            var locationTypeExists = await _context.LocationTypes
                .AnyAsync(lt => lt.Id == dto.LocationTypeId);

            if (!locationTypeExists)
                throw new InvalidOperationException("Location type not found");

            if (roleName == "Manager")
            {
                if (destination.ManagedByUserId != userId)
                    throw new InvalidOperationException("Manager can create locations only for the destination they manage");
            }
            else if (roleName == "Admin")
            {
                if (destination.ManagedByUserId != null)
                    throw new InvalidOperationException("Admin can create locations only for destinations without a manager");
            }

            var location = new Core.Models.Location
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                IsActive = dto.IsActive,
                DestinationId = dto.DestinationId,
                LocationTypeId = dto.LocationTypeId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Locations.Add(location);
            await _context.SaveChangesAsync();

            var created = await _context.Locations
                .Include(l => l.Destination)
                .Include(l => l.LocationType)
                .FirstAsync(l => l.Id == location.Id);

            return _mapper.Map<LocationDto>(created);
        }

        public async Task<LocationDto?> UpdateAsync(int id, UpdateLocationDto dto, int userId, string roleName)
        {
            var location = await _context.Locations
                .Include(l => l.Destination)
                .Include(l => l.LocationType)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (location == null)
                return null;

            var targetDestinationId = dto.DestinationId ?? location.DestinationId;

            var destination = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Id == targetDestinationId);

            if (destination == null)
                throw new InvalidOperationException("Destination not found");

            if (roleName == "Manager")
            {
                if (location.Destination?.ManagedByUserId != userId)
                    throw new InvalidOperationException("Manager can update only locations in their own destination");

                if (destination.ManagedByUserId != userId)
                    throw new InvalidOperationException("Manager can move locations only within destinations they manage");
            }
            else if (roleName == "Admin")
            {
                if (location.Destination?.ManagedByUserId != null)
                    throw new InvalidOperationException("Admin can update locations only when the current destination has no manager");

                if (destination.ManagedByUserId != null)
                    throw new InvalidOperationException("Admin can move locations only to destinations without a manager");
            }

            if (dto.LocationTypeId.HasValue)
            {
                var locationTypeExists = await _context.LocationTypes
                    .AnyAsync(lt => lt.Id == dto.LocationTypeId.Value);

                if (!locationTypeExists)
                    throw new InvalidOperationException("Location type not found");

                location.LocationTypeId = dto.LocationTypeId.Value;
            }

            if (dto.DestinationId.HasValue)
                location.DestinationId = dto.DestinationId.Value;

            if (!string.IsNullOrWhiteSpace(dto.Name))
                location.Name = dto.Name;

            if (dto.Description != null)
                location.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                location.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            if (dto.IsActive.HasValue)
                location.IsActive = dto.IsActive.Value;

            location.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Locations
                .Include(l => l.Destination)
                .Include(l => l.LocationType)
                .FirstAsync(l => l.Id == location.Id);

            return _mapper.Map<LocationDto>(updated);
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var location = await _context.Locations
                .Include(l => l.Destination)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (location == null)
                return false;

            if (roleName == "Manager")
            {
                if (location.Destination?.ManagedByUserId != userId)
                    throw new InvalidOperationException("Manager can delete locations only for the destination they manage");
            }
            else if (roleName == "Admin")
            {
                if (location.Destination?.ManagedByUserId != null)
                    throw new InvalidOperationException("Admin can delete locations only when the destination has no manager");
            }

            _context.Locations.Remove(location);
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