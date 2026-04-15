using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class EventPlannerService : IEventPlannerService
    {
        private readonly AppDbContext _context;

        public EventPlannerService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResultDto<EventPlannerDto>> GetMyPlannerAsync(int userId, EventPlannerQueryDto query)
        {
            NormalizeQuery(query);

            var itemsQuery = _context.EventPlannerItems
                .Include(x => x.Event)
                    .ThenInclude(e => e.EventType)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Locality)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Destination)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Object)
                .Where(x => x.UserId == userId)
                .AsQueryable();

            itemsQuery = ApplyFilters(itemsQuery, query);
            itemsQuery = ApplySorting(itemsQuery, query.SortBy, query.SortOrder);

            var totalCount = await itemsQuery.CountAsync();

            var items = await itemsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<EventPlannerDto>
            {
                Items = items.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<EventPlannerDto> AddAsync(CreateEventPlannerDto dto, int userId)
        {
            var ev = await _context.Events
                .Include(e => e.EventType)
                .Include(e => e.Locality)
                .Include(e => e.Destination)
                .Include(e => e.Object)
                .FirstOrDefaultAsync(e => e.Id == dto.EventId);

            if (ev == null)
                throw new InvalidOperationException("Event not found.");

            if (!ev.IsActive)
                throw new InvalidOperationException("Only active events can be added to planner.");

            if (ev.Status != ContentStatus.Approved)
                throw new InvalidOperationException("Only approved events can be added to planner.");

            var eventEnd = ev.EndDate ?? ev.StartDate;
            if (eventEnd < DateTime.UtcNow)
                throw new InvalidOperationException("Past events cannot be added to planner.");

            var alreadyExists = await _context.EventPlannerItems.AnyAsync(x =>
                x.UserId == userId && x.EventId == dto.EventId);

            if (alreadyExists)
                throw new InvalidOperationException("This event is already in your planner.");

            var item = new EventPlannerItem
            {
                UserId = userId,
                EventId = dto.EventId,
                AddedAt = DateTime.UtcNow
            };

            _context.EventPlannerItems.Add(item);
            await _context.SaveChangesAsync();

            var created = await _context.EventPlannerItems
                .Include(x => x.Event)
                    .ThenInclude(e => e.EventType)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Locality)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Destination)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Object)
                .FirstAsync(x => x.Id == item.Id);

            return MapToDto(created);
        }

        public async Task<bool> RemoveAsync(int id, int userId)
        {
            var item = await _context.EventPlannerItems
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);

            if (item == null)
                return false;

            _context.EventPlannerItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        private static void NormalizeQuery(EventPlannerQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;
        }

        private static IQueryable<EventPlannerItem> ApplyFilters(IQueryable<EventPlannerItem> query, EventPlannerQueryDto filters)
        {
            if (!string.IsNullOrWhiteSpace(filters.Search))
            {
                var search = filters.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.Event.Name.ToLower().Contains(search) ||
                    (x.Event.Object != null && x.Event.Object.Name.ToLower().Contains(search)) ||
                    (x.Event.Locality != null && x.Event.Locality.Name.ToLower().Contains(search)) ||
                    (x.Event.Destination != null && x.Event.Destination.Name.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(filters.Destination))
            {
                var destination = filters.Destination.Trim().ToLower();
                query = query.Where(x => x.Event.Destination != null && x.Event.Destination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(filters.Locality))
            {
                var locality = filters.Locality.Trim().ToLower();
                query = query.Where(x => x.Event.Locality != null && x.Event.Locality.Name.ToLower().Contains(locality));
            }

            if (!string.IsNullOrWhiteSpace(filters.EventType))
            {
                var eventType = filters.EventType.Trim().ToLower();
                query = query.Where(x => x.Event.EventType != null && x.Event.EventType.Name.ToLower().Contains(eventType));
            }

            if (!string.IsNullOrWhiteSpace(filters.Status))
            {
                var statusFilter = filters.Status.Trim();

                if (Enum.TryParse<ContentStatus>(statusFilter, true, out var parsedStatus))
                    query = query.Where(x => x.Event.Status == parsedStatus);
                else
                    query = query.Where(_ => false);
            }

            if (filters.IsActive.HasValue)
                query = query.Where(x => x.Event.IsActive == filters.IsActive.Value);

            if (filters.FromDate.HasValue)
                query = query.Where(x => x.Event.StartDate >= filters.FromDate.Value);

            if (filters.ToDate.HasValue)
                query = query.Where(x => x.Event.StartDate <= filters.ToDate.Value);

            return query;
        }

        private static IQueryable<EventPlannerItem> ApplySorting(IQueryable<EventPlannerItem> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "event" || sortByValue == "name" || sortByValue == "eventname")
            {
                return isDesc
                    ? query.OrderByDescending(x => x.Event.Name)
                    : query.OrderBy(x => x.Event.Name);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(x => x.Event.Destination != null ? x.Event.Destination.Name : string.Empty)
                    : query.OrderBy(x => x.Event.Destination != null ? x.Event.Destination.Name : string.Empty);
            }

            if (sortByValue == "addedat" || sortByValue == "added")
            {
                return isDesc
                    ? query.OrderByDescending(x => x.AddedAt)
                    : query.OrderBy(x => x.AddedAt);
            }

            return isDesc
                ? query.OrderByDescending(x => x.Event.StartDate).ThenByDescending(x => x.AddedAt)
                : query.OrderBy(x => x.Event.StartDate).ThenByDescending(x => x.AddedAt);
        }

        private static EventPlannerDto MapToDto(EventPlannerItem item)
        {
            var ev = item.Event;

            return new EventPlannerDto
            {
                Id = item.Id,
                UserId = item.UserId,
                EventId = item.EventId,
                EventName = ev.Name,
                StartDate = ev.StartDate,
                EndDate = ev.EndDate,
                EventTypeId = ev.EventTypeId,
                EventTypeName = ev.EventType?.Name ?? string.Empty,
                LocalityId = ev.LocalityId,
                LocalityName = ev.Locality?.Name,
                DestinationId = ev.DestinationId,
                DestinationName = ev.Destination?.Name,
                ObjectId = ev.ObjectId,
                ObjectName = ev.Object?.Name,
                IsActive = ev.IsActive,
                Status = ev.Status.ToString(),
                AddedAt = item.AddedAt
            };
        }
    }
}
