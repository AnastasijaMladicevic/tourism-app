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
                .Include(e => e.Locality)
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
                .Include(e => e.Locality)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstOrDefaultAsync(e => e.Id == id);

            return ev == null ? null : _mapper.Map<EventDto>(ev);
        }

        // CC i Menadžer mogu da kreiraju event; Menadžer samo za svoju destinaciju
        public async Task<EventDto> CreateAsync(CreateEventDto dto, int userId, string roleName)
        {
            await ValidateReferences(dto.EventTypeId, dto.LocalityId, dto.DestinationId, dto.ObjectId);

            if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
                throw new InvalidOperationException("End date cannot be before start date.");

            // Ako je naveden LocalityId, DestinationId mora biti isti kao destinacija lokacije
            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstAsync(l => l.Id == dto.LocalityId.Value);

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

                // Automatski postavi DestinationId sa lokacije ako nije naveden
                if (!dto.DestinationId.HasValue)
                    dto.DestinationId = locality.DestinationId;
            }

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
                LocalityId = dto.LocalityId,
                DestinationId = dto.DestinationId,
                ObjectId = dto.ObjectId,
                CreatedByUserId = userId,
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Events.Add(ev);
            await _context.SaveChangesAsync();

            return _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
        }

        public async Task<EventDto?> UpdateAsync(int id, UpdateEventDto dto, int userId, string roleName)
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

            // Samo ContentCreator može da menja sadržaj eventa, i to samo svoj
            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can update events.");

            if (ev.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can update only your own events.");

            if (dto.EventTypeId.HasValue)
            {
                var exists = await _context.EventTypes.AnyAsync(x => x.Id == dto.EventTypeId.Value);
                if (!exists) throw new InvalidOperationException("Event type not found.");
                ev.EventTypeId = dto.EventTypeId.Value;
            }

            // Validacija lokalitet/destinacija konzistentnosti
            int? newLocalityId = dto.LocalityId ?? ev.LocalityId;
            int? newDestinationId = dto.DestinationId ?? ev.DestinationId;

            if (newLocalityId.HasValue)
            {
                var locality = await _context.Localities.FindAsync(newLocalityId.Value);
                if (locality == null) throw new InvalidOperationException("Locality not found.");

                if (newDestinationId.HasValue && newDestinationId.Value != locality.DestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

                newDestinationId = locality.DestinationId;
            }

            ev.LocalityId = newLocalityId;
            ev.DestinationId = newDestinationId;

            if (dto.ObjectId.HasValue)
            {
                var exists = await _context.Objects.AnyAsync(x => x.Id == dto.ObjectId.Value);
                if (!exists) throw new InvalidOperationException("Object not found.");
                ev.ObjectId = dto.ObjectId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) ev.Name = dto.Name;
            if (dto.Description != null) ev.Description = dto.Description;
            if (dto.Longitude.HasValue && dto.Latitude.HasValue)
                ev.Geolocation = CreatePoint(dto.Longitude, dto.Latitude);
            if (dto.StartDate.HasValue) ev.StartDate = dto.StartDate.Value;
            if (dto.EndDate.HasValue) ev.EndDate = dto.EndDate.Value;

            if (ev.EndDate.HasValue && ev.EndDate.Value < ev.StartDate)
                throw new InvalidOperationException("End date cannot be before start date.");

            if (dto.Price.HasValue) ev.Price = dto.Price.Value;
            if (dto.MaxVisitors.HasValue) ev.MaxVisitors = dto.MaxVisitors.Value;
            if (dto.IsActive.HasValue) ev.IsActive = dto.IsActive.Value;

            ev.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
        }

        // Menadžer odobrava/odbija event za svoju destinaciju; Admin samo ako destinacija nema Menadžera
        public async Task<EventDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var ev = await _context.Events
                .Include(e => e.Destination)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

            if (ev.Status != ContentStatus.Pending)
                throw new InvalidOperationException("Only pending events can be approved or rejected.");

            var destination = ev.Destination;

            if (roleName == "Manager")
            {
                if (destination?.ManagedByUserId != userId)
                    throw new UnauthorizedAccessException("Manager can only approve events for their destination.");
            }
            else if (roleName == "Admin")
            {
                if (destination?.ManagedByUserId != null)
                    throw new UnauthorizedAccessException("This destination has a manager. The manager must approve this event.");
            }
            else
            {
                throw new UnauthorizedAccessException("Only managers or admins can approve events.");
            }

            ev.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            ev.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            ev.ApprovedByUserId = userId;
            ev.ApprovedAt = DateTime.UtcNow;
            ev.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
        }

        public async Task<bool> DeleteAsync(int id, int userId, string roleName)
        {
            var ev = await _context.Events
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return false;

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can delete events directly.");

            if (ev.CreatedByUserId != userId)
                throw new UnauthorizedAccessException("You can delete only your own events.");

            if (ev.Status == ContentStatus.Approved)
                throw new InvalidOperationException("Cannot delete an approved event directly. Submit a deletion request.");

            _context.Events.Remove(ev);
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task<Event> LoadEventAsync(int id)
        {
            return await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstAsync(e => e.Id == id);
        }

        private async Task ValidateReferences(int eventTypeId, int? localityId, int? destinationId, int? objectId)
        {
            if (!await _context.EventTypes.AnyAsync(x => x.Id == eventTypeId))
                throw new InvalidOperationException("Event type not found.");

            if (localityId.HasValue && !await _context.Localities.AnyAsync(x => x.Id == localityId.Value))
                throw new InvalidOperationException("Locality not found.");

            if (destinationId.HasValue && !await _context.Destinations.AnyAsync(x => x.Id == destinationId.Value))
                throw new InvalidOperationException("Destination not found.");

            if (objectId.HasValue && !await _context.Objects.AnyAsync(x => x.Id == objectId.Value))
                throw new InvalidOperationException("Object not found.");
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }
    }
}
