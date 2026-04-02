using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTOs;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services
{
    public class DestinationService : IDestinationService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public DestinationService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<DestinationDto>> GetAllAsync()
        {
            var destinations = await _context.Destinations
                .Include(d => d.DestinationType)
                .OrderBy(d => d.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<DestinationDto>>(destinations);
        }

        public async Task<DestinationDto?> GetByIdAsync(int id)
        {
            var destination = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstOrDefaultAsync(d => d.Id == id);

            return destination == null ? null : _mapper.Map<DestinationDto>(destination);
        }

        public async Task<DestinationDto> CreateAsync(CreateDestinationDto dto, int userId)
        {
            var destinationTypeExists = await _context.DestinationTypes
                .AnyAsync(dt => dt.Id == dto.DestinationTypeId);

            if (!destinationTypeExists)
                throw new InvalidOperationException("Destination type not found");

            var destination = new Destination
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                Status = ContentStatus.Approved,
                IsActive = dto.IsActive,
                DestinationTypeId = dto.DestinationTypeId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Destinations.Add(destination);
            await _context.SaveChangesAsync();

            var created = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstAsync(d => d.Id == destination.Id);

            return _mapper.Map<DestinationDto>(created);
        }

        // Admin može sve; Menadžer može samo svoju destinaciju
        public async Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationDto dto, int requestingUserId, string roleName)
        {
            var destination = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return null;

            if (roleName == "Manager" && destination.ManagedByUserId != requestingUserId)
                throw new UnauthorizedAccessException("Manager can only update their own destination.");

            if (dto.DestinationTypeId.HasValue)
            {
                var destinationTypeExists = await _context.DestinationTypes
                    .AnyAsync(dt => dt.Id == dto.DestinationTypeId.Value);

                if (!destinationTypeExists)
                    throw new InvalidOperationException("Destination type not found");

                destination.DestinationTypeId = dto.DestinationTypeId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                destination.Name = dto.Name;

            if (dto.Description != null)
                destination.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                destination.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            if (dto.IsActive.HasValue)
                destination.IsActive = dto.IsActive.Value;

            destination.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Destinations
                .Include(d => d.DestinationType)
                .FirstAsync(d => d.Id == destination.Id);

            return _mapper.Map<DestinationDto>(updated);
        }

        // Brisanje je blokirano ako destinacija ima lokacije, objekte ili evente
        public async Task<bool> DeleteAsync(int id)
        {
            var destination = await _context.Destinations
                .Include(d => d.Localities)
                .Include(d => d.Objects)
                .Include(d => d.Events)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                return false;

            if (destination.Localities.Any())
                throw new InvalidOperationException("Cannot delete destination that has localities. Remove them first.");

            if (destination.Objects.Any())
                throw new InvalidOperationException("Cannot delete destination that has objects. Remove them first.");

            if (destination.Events.Any())
                throw new InvalidOperationException("Cannot delete destination that has events. Remove them first.");

            _context.Destinations.Remove(destination);
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