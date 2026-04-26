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
        private readonly ITranslationService _translationService;

        public EventService(AppDbContext context, IMapper mapper, ITranslationService? translationService = null)
        {
            _context = context;
            _mapper = mapper;
            _translationService = translationService ?? NullTranslationService.Instance;
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

        private static IQueryable<Event> ApplyEventDateFilter(
            IQueryable<Event> query,
            DateTime? date,
            int? nextDays,
            DateTime? startDate,
            DateTime? endDate)
        {
            var hasDate = date.HasValue;
            var hasNextDays = nextDays.HasValue;
            var hasRange = startDate.HasValue || endDate.HasValue;

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
                periodStart = EnsureUtc(date!.Value.Date);
                periodEnd = EnsureUtc(periodStart.Value.AddDays(1));
            }
            else if (hasNextDays)
            {
                if (nextDays!.Value != 7 && nextDays.Value != 30)
                    throw new InvalidOperationException("NextDays can only be 7 or 30.");

                periodStart = DateTime.UtcNow.Date;
                periodEnd = periodStart.Value.AddDays(nextDays.Value);
            }
            else if (hasRange)
            {
                periodStart = EnsureUtc((startDate ?? endDate)!.Value.Date);
                periodEnd = EnsureUtc(((endDate ?? startDate)!.Value.Date).AddDays(1));

                if (periodEnd <= periodStart)
                    throw new InvalidOperationException("EndDate must be greater than or equal to StartDate.");
            }

            if (!periodStart.HasValue || !periodEnd.HasValue)
                return query;

            return query.Where(e =>
                e.StartDate < periodEnd.Value &&
                (!e.EndDate.HasValue || e.EndDate.Value >= periodStart.Value));
        }

        public async Task<PagedResultDto<EventDto>> GetAllAsync(EventQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var eventsQuery = _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Images)
                .Where(e => e.Status == ContentStatus.Approved)
                .Where(e => e.IsActive)
                .Where(e => e.Images.Any(i => i.IsMain))
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    e.EventType != null &&
                    e.EventType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    ((e.Destination != null && e.Destination.Name.ToLower().Contains(destination)) ||
                     (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (query.RegionId.HasValue)
            {
                eventsQuery = eventsQuery.Where(e =>
                    (e.Destination != null && e.Destination.RegionId == query.RegionId.Value) ||
                    (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);

            eventsQuery = ApplyEventDateFilter(eventsQuery, query.Date, query.NextDays, query.StartDate, query.EndDate);

            if (search != null)
                eventsQuery = ApplyEventSearch(eventsQuery, search);

            if (search == null)
                eventsQuery = ApplySorting(eventsQuery, query.SortBy, query.SortOrder);

            var totalCount = await eventsQuery.CountAsync();

            var items = await eventsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<EventDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<EventDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<EventDto>> GetNearbyAsync(NearbyEventQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var eventsQuery = _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .Where(e => e.Status == ContentStatus.Approved)
                .Where(e => e.IsActive)
                .Where(e => e.Geolocation != null)
                .Where(e => e.Images.Any(i => i.IsMain))
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    e.EventType != null &&
                    e.EventType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    ((e.Destination != null && e.Destination.Name.ToLower().Contains(destination)) ||
                     (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (query.RegionId.HasValue)
            {
                eventsQuery = eventsQuery.Where(e =>
                    (e.Destination != null && e.Destination.RegionId == query.RegionId.Value) ||
                    (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                eventsQuery = ApplyEventSearchFilter(eventsQuery, search);

            eventsQuery = ApplyEventDateFilter(eventsQuery, query.Date, query.NextDays, query.StartDate, query.EndDate);

            var events = await eventsQuery.ToListAsync();

            var nearbyEvents = events
                .Select(ev => new
                {
                    Event = ev,
                    DistanceMeters = CalculateDistanceMeters(
                        query.Latitude,
                        query.Longitude,
                        ev.Geolocation!.Y,
                        ev.Geolocation.X)
                })
                .Where(x => x.DistanceMeters <= query.RadiusMeters)
                .ToList();

            var isDesc = string.Equals(query.SortOrder?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            nearbyEvents = isDesc
                ? nearbyEvents.OrderByDescending(x => x.DistanceMeters).ThenBy(x => x.Event.Name).ToList()
                : nearbyEvents.OrderBy(x => x.DistanceMeters).ThenBy(x => x.Event.Name).ToList();

            var totalCount = nearbyEvents.Count;

            var items = nearbyEvents
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x =>
                {
                    var dto = _mapper.Map<EventDto>(x.Event);
                    dto.DistanceMeters = Math.Round(x.DistanceMeters, 2);
                    return dto;
                })
                .ToList();

            await ApplyTranslationsAsync(items, nearbyEvents
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x => x.Event)
                .ToList(), query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(items);

            return new PagedResultDto<EventDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<EventDto>> GetMyAsync(int userId, EventQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var eventsQuery = _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .Where(e => e.CreatedByUserId == userId)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    e.EventType != null &&
                    e.EventType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    ((e.Destination != null && e.Destination.Name.ToLower().Contains(destination)) ||
                     (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (query.RegionId.HasValue)
            {
                eventsQuery = eventsQuery.Where(e =>
                    (e.Destination != null && e.Destination.RegionId == query.RegionId.Value) ||
                    (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.RegionId == query.RegionId.Value));
            }

            eventsQuery = ApplyEventDateFilter(eventsQuery, query.Date, query.NextDays, query.StartDate, query.EndDate);
            eventsQuery = ApplyStatusFilter(eventsQuery, query.Status);
            var search = NormalizeSearchTerm(query.Search);
            if (search != null)
                eventsQuery = ApplyEventSearchFilter(eventsQuery, search);
            eventsQuery = ApplySorting(eventsQuery, query.SortBy, query.SortOrder);

            var totalCount = await eventsQuery.CountAsync();

            var items = await eventsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<EventDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<EventDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<List<EventTypeOptionDto>> GetEventTypesAsync()
        {
            return await _context.EventTypes
                .OrderBy(t => t.Name)
                .Select(t => new EventTypeOptionDto
                {
                    Id = t.Id,
                    Name = t.Name
                })
                .ToListAsync();
        }

        public async Task<PagedResultDto<EventDto>> GetForManagerAsync(int userId, EventQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var destinationIds = await DestinationManagerHelper.GetResponsibleDestinationIdsAsync(_context, userId);

            var eventsQuery = _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .Where(e =>
                    (e.DestinationId.HasValue && destinationIds.Contains(e.DestinationId.Value)) ||
                    (!e.DestinationId.HasValue && e.Locality != null && destinationIds.Contains(e.Locality.DestinationId)))
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    e.EventType != null &&
                    e.EventType.Name.ToLower().Contains(type));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();
                eventsQuery = eventsQuery.Where(e =>
                    ((e.Destination != null && e.Destination.Name.ToLower().Contains(destination)) ||
                     (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.Name.ToLower().Contains(destination))));
            }

            if (query.RegionId.HasValue)
            {
                eventsQuery = eventsQuery.Where(e =>
                    (e.Destination != null && e.Destination.RegionId == query.RegionId.Value) ||
                    (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.RegionId == query.RegionId.Value));
            }

            var search = NormalizeSearchTerm(query.Search);

            eventsQuery = ApplyEventDateFilter(eventsQuery, query.Date, query.NextDays, query.StartDate, query.EndDate);

            eventsQuery = ApplyStatusFilter(eventsQuery, query.Status);
            if (search != null)
                eventsQuery = ApplyEventSearchFilter(eventsQuery, search);
            eventsQuery = ApplySorting(eventsQuery, query.SortBy, query.SortOrder);

            var totalCount = await eventsQuery.CountAsync();

            var items = await eventsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var mappedItems = _mapper.Map<List<EventDto>>(items);
            await ApplyTranslationsAsync(mappedItems, items, query.Lang);
            await ApplyPendingDeletionRequestFlagsAsync(mappedItems);

            return new PagedResultDto<EventDto>
            {
                Items = mappedItems,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<EventDto?> GetByIdAsync(int id, string lang = "sr")
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

            if (ev.Status != ContentStatus.Approved || !ev.IsActive)
                return null;

            var hasMainImage = await _context.Images.AnyAsync(i => i.EventId == ev.Id && i.IsMain);
            if (!hasMainImage)
                return null;

            var dto = _mapper.Map<EventDto>(ev);
            await ApplyTranslationsAsync(dto, ev, lang);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<EventDto?> GetMineByIdAsync(int id, int userId, string lang = "sr")
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .FirstOrDefaultAsync(e => e.Id == id && e.CreatedByUserId == userId);

            if (ev == null)
                return null;

            var dto = _mapper.Map<EventDto>(ev);
            await ApplyTranslationsAsync(dto, ev, lang);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<EventDto?> GetForManagerByIdAsync(int id, int userId, string lang = "sr")
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

            var destination = ev.Destination ?? ev.Locality?.Destination;
            if (destination == null)
                return null;

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                return null;

            var dto = _mapper.Map<EventDto>(ev);
            await ApplyTranslationsAsync(dto, ev, lang);
            await ApplyPendingDeletionRequestFlagsAsync(dto);
            return dto;
        }

        public async Task<EventDto> CreateAsync(CreateEventDto dto, int userId, string roleName)
        {
            await ValidateReferences(dto.EventTypeId, dto.LocalityId, dto.DestinationId, dto.ObjectId);

            if (roleName != "ContentCreator")
                throw new UnauthorizedAccessException("Only content creators can create events.");

            ValidateEventPayload(dto.StartDate, dto.EndDate, dto.Price, dto.MaxVisitors, dto.Longitude, dto.Latitude);

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

            // Save image if provided
            if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
            {
                var image = new Image
                {
                    EventId = ev.Id,
                    Url = dto.ImageUrl,
                    IsMain = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Images.Add(image);
                await _context.SaveChangesAsync();
            }

            var result = _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
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

            if ((dto.Longitude.HasValue && !dto.Latitude.HasValue) || (!dto.Longitude.HasValue && dto.Latitude.HasValue))
                throw new InvalidOperationException("Both longitude and latitude must be provided together.");

            if (dto.Price.HasValue && dto.Price.Value < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            if (dto.MaxVisitors.HasValue && dto.MaxVisitors.Value <= 0)
                throw new InvalidOperationException("MaxVisitors must be greater than 0.");

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

            ev.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        public async Task<EventDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName)
        {
            var ev = await _context.Events
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
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

            if (dto.Approve)
            {
                var hasMainImage = await _context.Images
                    .AnyAsync(i => i.EventId == ev.Id && i.IsMain);

                if (!hasMainImage)
                    throw new InvalidOperationException("Event must have a main image before approval.");
            }

            ev.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            ev.RejectionReason = dto.Approve ? null : dto.RejectionReason;
            ev.ApprovedByUserId = userId;
            ev.ApprovedAt = DateTime.UtcNow;
            ev.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
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
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                .Include(e => e.Images)
                .FirstAsync(e => e.Id == id);
        }

        private async Task ValidateReferences(int eventTypeId, int? localityId, int? destinationId, int? objectId)
        {
            if (!await _context.EventTypes.AnyAsync(x => x.Id == eventTypeId))
                throw new InvalidOperationException("Event type not found.");

            int? effectiveDestinationId = destinationId;

            if (localityId.HasValue && !await _context.Localities.AnyAsync(x => x.Id == localityId.Value))
                throw new InvalidOperationException("Locality not found.");

            if (localityId.HasValue)
            {
                var localityDestinationId = await _context.Localities
                    .Where(x => x.Id == localityId.Value)
                    .Select(x => x.DestinationId)
                    .FirstAsync();

                if (destinationId.HasValue && destinationId.Value != localityDestinationId)
                    throw new InvalidOperationException("Locality does not belong to the specified destination.");

                effectiveDestinationId ??= localityDestinationId;
            }

            if (destinationId.HasValue && !await _context.Destinations.AnyAsync(x => x.Id == destinationId.Value))
                throw new InvalidOperationException("Destination not found.");
            if (objectId.HasValue)
            {
                var touristObject = await _context.Objects
                    .AsNoTracking()
                    .Where(x => x.Id == objectId.Value)
                    .Select(x => new { x.Id, x.DestinationId })
                    .FirstOrDefaultAsync();

                if (touristObject == null)
                    throw new InvalidOperationException("Object not found.");

                if (effectiveDestinationId.HasValue && touristObject.DestinationId != effectiveDestinationId.Value)
                    throw new InvalidOperationException("Selected object does not belong to the specified destination.");
            }
        }

        private static void ValidateEventPayload(DateTime startDate, DateTime? endDate, decimal? price, int? maxVisitors, double? longitude, double? latitude)
        {
            if (startDate == default)
                throw new InvalidOperationException("Start date is required.");

            if ((longitude.HasValue && !latitude.HasValue) || (!longitude.HasValue && latitude.HasValue))
                throw new InvalidOperationException("Both longitude and latitude must be provided together.");

            if (price.HasValue && price.Value < 0)
                throw new InvalidOperationException("Price cannot be negative.");

            if (maxVisitors.HasValue && maxVisitors.Value <= 0)
                throw new InvalidOperationException("MaxVisitors must be greater than 0.");

            if (endDate.HasValue && endDate.Value < startDate)
                throw new InvalidOperationException("End date cannot be before start date.");
        }

        private static Point? CreatePoint(double? longitude, double? latitude)
        {
            if (!longitude.HasValue || !latitude.HasValue)
                return null;

            return new Point(longitude.Value, latitude.Value) { SRID = 4326 };
        }

        private static double CalculateDistanceMeters(double latitude1, double longitude1, double latitude2, double longitude2)
        {
            const double earthRadiusMeters = 6371000d;

            var deltaLatitude = DegreesToRadians(latitude2 - latitude1);
            var deltaLongitude = DegreesToRadians(longitude2 - longitude1);
            var normalizedLatitude1 = DegreesToRadians(latitude1);
            var normalizedLatitude2 = DegreesToRadians(latitude2);

            var a =
                Math.Sin(deltaLatitude / 2) * Math.Sin(deltaLatitude / 2) +
                Math.Cos(normalizedLatitude1) * Math.Cos(normalizedLatitude2) *
                Math.Sin(deltaLongitude / 2) * Math.Sin(deltaLongitude / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusMeters * c;
        }

        private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

        public async Task<EventDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName)
        {
            var ev = await _context.Events
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.EventType)
                .Include(e => e.Object)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return null;

            if (roleName != "Manager")
                throw new UnauthorizedAccessException("Only managers can change event visibility.");

            if (ev.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved events can have visibility changed.");

            var destination = ev.Destination ?? ev.Locality?.Destination;
            if (destination == null)
                throw new InvalidOperationException("Cannot determine destination for this event.");

            var isResponsible = await DestinationManagerHelper.IsResponsibleManagerAsync(_context, destination, userId);
            if (!isResponsible)
                throw new UnauthorizedAccessException("You are not the responsible manager for this destination.");

            ev.IsActive = isActive;
            ev.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = _mapper.Map<EventDto>(await LoadEventAsync(ev.Id));
            await ApplyPendingDeletionRequestFlagsAsync(result);
            return result;
        }

        public async Task<PagedResultDto<EventDto>> SearchAsync(EventQueryDto query)
        {
            return await GetAllAsync(query);
        }

        private static IQueryable<Event> ApplyStatusFilter(IQueryable<Event> query, string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return query;

            if (!Enum.TryParse<ContentStatus>(status.Trim(), true, out var parsedStatus))
                return query.Where(_ => false);

            return query.Where(e => e.Status == parsedStatus);
        }

        private static string? NormalizeSearchTerm(string? search)
        {
            return string.IsNullOrWhiteSpace(search)
                ? null
                : search.Trim().ToLower();
        }

        private static IQueryable<Event> ApplyEventSearch(IQueryable<Event> query, string search)
        {
            return ApplyEventSearchFilter(query, search)
                .OrderBy(e => e.Name.ToLower().Contains(search) ? 0 :
                    (e.EventType != null && e.EventType.Name.ToLower().Contains(search) ? 1 :
                    (e.Description != null && e.Description.ToLower().Contains(search) ? 2 : 3)))
                .ThenBy(e => e.Name);
        }

        private static IQueryable<Event> ApplyEventSearchFilter(IQueryable<Event> query, string search)
        {
            return query.Where(e =>
                e.Name.ToLower().Contains(search) ||
                (e.EventType != null && e.EventType.Name.ToLower().Contains(search)) ||
                (e.Description != null && e.Description.ToLower().Contains(search)));
        }

        private static IQueryable<Event> ApplySorting(IQueryable<Event> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "name")
            {
                return isDesc
                    ? query.OrderByDescending(e => e.Name)
                    : query.OrderBy(e => e.Name);
            }

            if (sortByValue == "type")
            {
                return isDesc
                    ? query.OrderByDescending(e => e.EventType!.Name)
                    : query.OrderBy(e => e.EventType!.Name);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(e => e.Destination!.Name)
                    : query.OrderBy(e => e.Destination!.Name);
            }

            if (sortByValue == "status")
            {
                return isDesc
                    ? query.OrderByDescending(e => e.Status)
                    : query.OrderBy(e => e.Status);
            }

            return isDesc
                ? query.OrderByDescending(e => e.StartDate)
                : query.OrderBy(e => e.StartDate);
        }

        private async Task ApplyPendingDeletionRequestFlagsAsync(List<EventDto> items)
        {
            if (items.Count == 0)
                return;

            var eventIds = items.Select(x => x.Id).Distinct().ToList();

            var pendingIds = await _context.DeletionRequests
                .AsNoTracking()
                .Where(dr => dr.EventId.HasValue
                    && eventIds.Contains(dr.EventId.Value)
                    && dr.Status == ContentStatus.Pending)
                .Select(dr => dr.EventId!.Value)
                .Distinct()
                .ToListAsync();

            var pendingIdSet = pendingIds.ToHashSet();

            foreach (var item in items)
            {
                item.HasPendingDeletionRequest = pendingIdSet.Contains(item.Id);
            }
        }

        private Task ApplyPendingDeletionRequestFlagsAsync(EventDto item)
        {
            return ApplyPendingDeletionRequestFlagsAsync(new List<EventDto> { item });
        }

        private async Task ApplyTranslationsAsync(List<EventDto> dtos, List<Event> events, string? lang)
        {
            if (dtos.Count == 0 || events.Count == 0)
                return;

            var normalizedLang = NormalizeLanguage(lang);
            if (normalizedLang == "sr" || normalizedLang == "me")
                return;

            var eventsById = events.ToDictionary(e => e.Id);
            foreach (var dto in dtos)
            {
                if (eventsById.TryGetValue(dto.Id, out var ev))
                    await ApplyTranslationsAsync(dto, ev, normalizedLang, true);
            }
        }

        private async Task ApplyTranslationsAsync(EventDto dto, Event ev, string? lang, bool createMissing = true)
        {
            var normalizedLang = NormalizeLanguage(lang);
            if (normalizedLang == "sr" || normalizedLang == "me")
                return;

            dto.Description = createMissing
                ? await _translationService.GetOrCreateTextAsync(
                "Event",
                ev.Id,
                "Description",
                ev.Description ?? string.Empty,
                normalizedLang)
                : await _translationService.GetTextAsync(
                "Event",
                ev.Id,
                "Description",
                ev.Description ?? string.Empty,
                normalizedLang);

            if (ev.EventType != null && !string.IsNullOrWhiteSpace(ev.EventType.Name))
            {
                dto.EventTypeName = createMissing
                    ? await _translationService.GetOrCreateTextAsync(
                    "EventType",
                    ev.EventType.Id,
                    "Name",
                    ev.EventType.Name,
                    normalizedLang)
                    : await _translationService.GetTextAsync(
                    "EventType",
                    ev.EventType.Id,
                    "Name",
                    ev.EventType.Name,
                    normalizedLang);
            }
        }

        private static string NormalizeLanguage(string? lang)
        {
            return string.IsNullOrWhiteSpace(lang)
                ? "sr"
                : lang.Trim().ToLowerInvariant();
        }
    }
}