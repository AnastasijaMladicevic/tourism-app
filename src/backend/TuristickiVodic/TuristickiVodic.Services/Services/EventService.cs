using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class EventService : IEventService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public EventService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<EventDto>> GetAllAsync()
        {
            var events = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Location)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .OrderBy(e => e.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<EventDto>>(events);
        }

        public async Task<EventDto?> GetByIdAsync(int id)
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Location)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstOrDefaultAsync(e => e.Id == id);

            return ev == null ? null : _mapper.Map<EventDto>(ev);
        }

        public async Task<EventDto> CreateAsync(CreateEventDto dto, int userId)
        {
            await ValidateReferences(dto.EventTypeId, dto.LocationId, dto.DestinationId, dto.ObjectId);

            if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
                throw new InvalidOperationException("End date cannot be before start date.");

            var ev = new Event
            {
                Name = dto.Name,
                Description = dto.Description,
                Geolocation = CreatePoint(dto.Longitude, dto.Latitude),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Price = dto.Price,
                MaxVisitors = dto.MaxVisitors,
                IsActive = dto.IsActive,
                EventTypeId = dto.EventTypeId,
                LocationId = dto.LocationId,
                DestinationId = dto.DestinationId,
                ObjectId = dto.ObjectId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Events.Add(ev);
            await _context.SaveChangesAsync();

            var created = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Location)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstAsync(e => e.Id == ev.Id);

            return _mapper.Map<EventDto>(created);
        }

        public async Task<EventDto?> UpdateAsync(int id, UpdateEventDto dto, int userId, string roleName)
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Location)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

            if (roleName != "Admin" && ev.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can update only your own events.");

            if (dto.EventTypeId.HasValue)
            {
                var exists = await _context.EventTypes.AnyAsync(x => x.Id == dto.EventTypeId.Value);
                if (!exists)
                    throw new InvalidOperationException("Event type not found.");

                ev.EventTypeId = dto.EventTypeId.Value;
            }

            if (dto.LocationId.HasValue)
            {
                var exists = await _context.Locations.AnyAsync(x => x.Id == dto.LocationId.Value);
                if (!exists)
                    throw new InvalidOperationException("Location not found.");

                ev.LocationId = dto.LocationId.Value;
            }

            if (dto.DestinationId.HasValue)
            {
                var exists = await _context.Destinations.AnyAsync(x => x.Id == dto.DestinationId.Value);
                if (!exists)
                    throw new InvalidOperationException("Destination not found.");

                ev.DestinationId = dto.DestinationId.Value;
            }

            if (dto.ObjectId.HasValue)
            {
                var exists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!exists)
                    throw new InvalidOperationException("Object not found.");

                ev.ObjectId = dto.ObjectId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                ev.Name = dto.Name;

            if (dto.Description != null)
                ev.Description = dto.Description;

            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                ev.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);

            if (dto.StartDate.HasValue)
                ev.StartDate = dto.StartDate.Value;

            if (dto.EndDate.HasValue)
                ev.EndDate = dto.EndDate.Value;

            if (ev.EndDate.HasValue && ev.EndDate.Value < ev.StartDate)
                throw new InvalidOperationException("End date cannot be before start date.");

            if (dto.Price.HasValue)
                ev.Price = dto.Price.Value;

            if (dto.MaxVisitors.HasValue)
                ev.MaxVisitors = dto.MaxVisitors.Value;

            if (dto.IsActive.HasValue)
                ev.IsActive = dto.IsActive.Value;

            ev.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updated = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Location)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstAsync(e => e.Id == ev.Id);

            return _mapper.Map<EventDto>(updated);
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return false;

            if (roleName != "Admin" && ev.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can delete only your own events.");

            _context.Events.Remove(ev);
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task ValidateReferences(int eventTypeId, int? locationId, int? destinationId, int? objectId)
        {
            var eventTypeExists = await _context.EventTypes.AnyAsync(x => x.Id == eventTypeId);
            if (!eventTypeExists)
                throw new InvalidOperationException("Event type not found.");

            if (locationId.HasValue)
            {
                var locationExists = await _context.Locations.AnyAsync(x => x.Id == locationId.Value);
                if (!locationExists)
                    throw new InvalidOperationException("Location not found.");
            }

            if (destinationId.HasValue)
            {
                var destinationExists = await _context.Destinations.AnyAsync(x => x.Id == destinationId.Value);
                if (!destinationExists)
                    throw new InvalidOperationException("Destination not found.");
            }

            if (objectId.HasValue)
            {
                var objectExists = await _context.Objects.AnyAsync(x => x.Id == objectId.Value);
                if (!objectExists)
                    throw new InvalidOperationException("Object not found.");
            }
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }
    }
}