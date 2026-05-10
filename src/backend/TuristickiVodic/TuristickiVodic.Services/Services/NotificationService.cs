using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;

        public NotificationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResultDto<NotificationDto>> GetMyAsync(int userId, NotificationQueryDto query)
        {
            NormalizeQuery(query);
            await GeneratePlannerEventRemindersAsync(userId);

            var notificationsQuery = _context.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == userId);

            notificationsQuery = ApplyFilters(notificationsQuery, query);

            var totalCount = await notificationsQuery.CountAsync();
            var items = await notificationsQuery
                .OrderByDescending(n => n.CreatedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<NotificationDto>
            {
                Items = items.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize),
            };
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            await GeneratePlannerEventRemindersAsync(userId);

            return await _context.Notifications
                .AsNoTracking()
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task<bool> MarkAsReadAsync(int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (notification == null)
                return false;

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        public async Task<int> MarkAllAsReadAsync(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (notifications.Count == 0)
                return 0;

            var readAt = DateTime.UtcNow;
            foreach (var notification in notifications)
            {
                notification.IsRead = true;
                notification.ReadAt = readAt;
            }

            await _context.SaveChangesAsync();
            return notifications.Count;
        }

        public async Task<bool> DeleteReadAsync(int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (notification == null || !notification.IsRead)
                return false;

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> DeleteAllReadAsync(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && n.IsRead)
                .ToListAsync();

            if (notifications.Count == 0)
                return 0;

            _context.Notifications.RemoveRange(notifications);
            await _context.SaveChangesAsync();
            return notifications.Count;
        }

        private async Task GeneratePlannerEventRemindersAsync(int userId)
        {
            var now = DateTime.UtcNow;
            var reminderWindowEnd = now.AddHours(2);

            var duePlannerItems = await _context.EventPlannerItems
                .AsNoTracking()
                .Include(item => item.Event)
                .Where(item =>
                    item.UserId == userId &&
                    item.Event.IsActive &&
                    item.Event.Status == ContentStatus.Approved &&
                    item.Event.StartDate > now &&
                    item.Event.StartDate <= reminderWindowEnd)
                .Select(item => new
                {
                    PlannerItemId = item.Id,
                    item.EventId,
                    EventName = item.Event.Name,
                    item.Event.StartDate
                })
                .ToListAsync();

            if (duePlannerItems.Count == 0)
                return;

            var plannerItemIds = duePlannerItems.Select(item => item.PlannerItemId).ToList();

            var existingReminderKeys = await _context.Notifications
                .AsNoTracking()
                .Where(n =>
                    n.UserId == userId &&
                    n.Type == NotificationType.PlannerEventReminder2Hours &&
                    n.EventPlannerItemId.HasValue &&
                    plannerItemIds.Contains(n.EventPlannerItemId.Value))
                .Select(n => new
                {
                    n.EventPlannerItemId,
                    n.TriggerAtUtc
                })
                .ToListAsync();

            var existingKeySet = existingReminderKeys
                .Where(x => x.EventPlannerItemId.HasValue && x.TriggerAtUtc.HasValue)
                .Select(x => $"{x.EventPlannerItemId!.Value}:{x.TriggerAtUtc!.Value.Ticks}")
                .ToHashSet();

            var newNotifications = duePlannerItems
                .Where(item => !existingKeySet.Contains($"{item.PlannerItemId}:{item.StartDate.AddHours(-2).Ticks}"))
                .Select(item => new Notification
                {
                    UserId = userId,
                    Type = NotificationType.PlannerEventReminder2Hours,
                    Title = "Dogadjaj pocinje uskoro",
                    Message = $"Dogadjaj \"{item.EventName}\" pocinje za manje od 2 sata.",
                    ActionUrl = $"/event/{item.EventId}",
                    EventId = item.EventId,
                    EventPlannerItemId = item.PlannerItemId,
                    TriggerAtUtc = item.StartDate.AddHours(-2),
                    CreatedAt = now
                })
                .ToList();

            if (newNotifications.Count == 0)
                return;

            _context.Notifications.AddRange(newNotifications);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                foreach (var notification in newNotifications)
                {
                    _context.Entry(notification).State = EntityState.Detached;
                }
            }
        }

        private static IQueryable<Notification> ApplyFilters(IQueryable<Notification> query, NotificationQueryDto filters)
        {
            if (filters.IsRead.HasValue)
            {
                query = query.Where(n => n.IsRead == filters.IsRead.Value);
            }

            if (!string.IsNullOrWhiteSpace(filters.Type) &&
                Enum.TryParse<NotificationType>(filters.Type.Trim(), true, out var parsedType))
            {
                query = query.Where(n => n.Type == parsedType);
            }

            return query;
        }

        private static void NormalizeQuery(NotificationQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 20;

            if (query.PageSize > 100)
                query.PageSize = 100;
        }

        private static NotificationDto MapToDto(Notification notification)
        {
            return new NotificationDto
            {
                Id = notification.Id,
                Type = notification.Type.ToString(),
                Title = notification.Title,
                Message = notification.Message,
                ActionUrl = notification.ActionUrl,
                IsRead = notification.IsRead,
                ReadAt = notification.ReadAt,
                EventId = notification.EventId,
                ReviewId = notification.ReviewId,
                EventPlannerItemId = notification.EventPlannerItemId,
                TriggerAtUtc = notification.TriggerAtUtc,
                CreatedAt = notification.CreatedAt
            };
        }
    }
}
