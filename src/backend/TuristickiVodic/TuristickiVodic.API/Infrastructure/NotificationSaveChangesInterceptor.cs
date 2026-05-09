using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using TuristickiVodic.API.Hubs;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;

namespace TuristickiVodic.API.Infrastructure
{
    public class NotificationSaveChangesInterceptor : SaveChangesInterceptor
    {
        private readonly IHubContext<NotificationsHub> _hubContext;
        private readonly List<Notification> _pendingNotifications = new();

        public NotificationSaveChangesInterceptor(IHubContext<NotificationsHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData,
            InterceptionResult<int> result)
        {
            CapturePendingNotifications(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            CapturePendingNotifications(eventData.Context);
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
        {
            _ = PublishPendingNotificationsAsync(CancellationToken.None);
            return base.SavedChanges(eventData, result);
        }

        public override async ValueTask<int> SavedChangesAsync(
            SaveChangesCompletedEventData eventData,
            int result,
            CancellationToken cancellationToken = default)
        {
            await PublishPendingNotificationsAsync(cancellationToken);
            return await base.SavedChangesAsync(eventData, result, cancellationToken);
        }

        private void CapturePendingNotifications(DbContext? context)
        {
            if (context == null)
                return;

            var notifications = context.ChangeTracker
                .Entries<Notification>()
                .Where(entry => entry.State == EntityState.Added)
                .Select(entry => entry.Entity)
                .Where(notification => !_pendingNotifications.Contains(notification))
                .ToList();

            _pendingNotifications.AddRange(notifications);
        }

        private async Task PublishPendingNotificationsAsync(CancellationToken cancellationToken)
        {
            if (_pendingNotifications.Count == 0)
                return;

            var notifications = _pendingNotifications.ToList();
            _pendingNotifications.Clear();

            foreach (var notification in notifications)
            {
                await _hubContext.Clients
                    .Group(NotificationsHub.GetUserGroupName(notification.UserId))
                    .SendAsync("notificationReceived", MapToDto(notification), cancellationToken);
            }
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
