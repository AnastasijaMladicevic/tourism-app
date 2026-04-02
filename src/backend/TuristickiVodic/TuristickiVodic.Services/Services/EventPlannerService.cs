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

        public async Task<IEnumerable<EventPlannerDto>> GetMyPlannerAsync(int userId)
        {
            var items = await _context.EventPlannerItems
                .Include(x => x.Event)
                    .ThenInclude(e => e.EventType)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Locality)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Destination)
                .Include(x => x.Event)
                    .ThenInclude(e => e.Object)
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.Event.StartDate)
                .ThenByDescending(x => x.AddedAt)
                .ToListAsync();

            return items.Select(MapToDto);
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
