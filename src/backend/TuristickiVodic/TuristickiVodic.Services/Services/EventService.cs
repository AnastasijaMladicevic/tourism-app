using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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

        private static DateTime EnsureUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
                _ => value
            };
        }

        public async Task<IEnumerable<EventDto>> GetAllAsync()
        {
            var events = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .Where(e => _context.Images.Any(i => i.EventId == e.Id && i.IsMain))
                .OrderBy(e => e.Id)
                .ToListAsync();

            return _mapper.Map<IEnumerable<EventDto>>(events);
        }

        public async Task<IEnumerable<EventDto>> GetAllAsync(EventFilterDto? filter = null)
        {
            var query = _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .AsQueryable();

            if (filter != null)
            {
                var hasDate = filter.Date.HasValue;
                var hasNextDays = filter.NextDays.HasValue;
                var hasRange = filter.StartDate.HasValue || filter.EndDate.HasValue;

                var filterCount = 0;
                if (hasDate) filterCount++;
                if (hasNextDays) filterCount++;
                if (hasRange) filterCount++;

                if (filterCount > 1)
                    throw new InvalidOperationException("Use only one type of date filter at a time.");

                DateTime? periodStart = null;
                DateTime? periodEnd = null;

                if (hasDate)
                {
                    periodStart = EnsureUtc(filter.Date!.Value.Date);
                    periodEnd = EnsureUtc(periodStart.Value.AddDays(1));
                }
                else if (hasNextDays)
                {
                    if (filter.NextDays!.Value != 7 && filter.NextDays.Value != 30)
                        throw new InvalidOperationException("NextDays can only be 7 or 30.");

                    periodStart = DateTime.UtcNow.Date;
                    periodEnd = periodStart.Value.AddDays(filter.NextDays.Value);
                }
                else if (hasRange)
                {
                    periodStart = EnsureUtc((filter.StartDate ?? filter.EndDate)!.Value.Date);
                    periodEnd = EnsureUtc(((filter.EndDate ?? filter.StartDate)!.Value.Date).AddDays(1));

                    if (periodEnd <= periodStart)
                        throw new InvalidOperationException("EndDate must be greater than or equal to StartDate.");
                }

                if (periodStart.HasValue && periodEnd.HasValue)
                {
                    query = query.Where(e =>
                        e.StartDate < periodEnd.Value &&
                        (!e.EndDate.HasValue || e.EndDate.Value >= periodStart.Value));
                }
            }

            var events = await query
                .OrderBy(e => e.StartDate)
                .ThenBy(e => e.Id)
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

            if (ev == null)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.EventId == ev.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            return _mapper.Map<EventDto>(ev);
        }

        public async Task<EventDto> CreateAsync(CreateEventDto dto, int userId, string roleName)
        {
            await ValidateReferences(dto.EventTypeId, dto.LocalityId, dto.DestinationId, dto.ObjectId);

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can create events.");

            if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
                throw new InvalidOperationException("End date cannot be before start date.");

            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities
                    .Include(l => l.Destination)
                    .FirstAsync(l => l.Id == dto.LocalityId.Value);

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

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
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

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

            if (dto.LocalityId.HasValue)
            {
                var locality = await _context.Localities
                    .FirstOrDefaultAsync(x => x.Id == dto.LocalityId.Value);

                if (locality == null)
                    throw new InvalidOperationException("Locality not found.");

                if (dto.DestinationId.HasValue && dto.DestinationId.Value != locality.DestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

                ev.LocalityId = dto.LocalityId.Value;
                ev.DestinationId = locality.DestinationId;
            }

            if (dto.DestinationId.HasValue && !dto.LocalityId.HasValue)
            {
                var exists = await _context.Destinations.AnyAsync(x => x.Id == dto.DestinationId.Value);
                if (!exists) throw new InvalidOperationException("Destination not found.");
                ev.DestinationId = dto.DestinationId.Value;
            }

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
                var isResponsible = destination != null &&
                    await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);

                if (!isResponsible)
                    throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");
            }
            else if (roleName == "Admin")
            {
                throw new UnauthorizedAccessException("Admins do not directly approve events. The responsible manager handles approvals.");
            }
            else
            {
                throw new UnauthorizedAccessException("Only the responsible manager can approve events.");
            }

            var hasMainImage = await _context.Images
                .AnyAsync(i => i.EventId == ev.Id && i.IsMain);

            if (!hasMainImage)
                throw new InvalidOperationException("Event must have a main image before approval.");

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