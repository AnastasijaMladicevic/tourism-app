using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using TuristickiVodic.API.Hubs;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Infrastructure
{
    public class NotificationSaveChangesInterceptor : SaveChangesInterceptor
    {
        private readonly IHubContext<NotificationsHub> _hubContext;
        private readonly IWebPushService _webPushService;
        private readonly NotificationPresenceTracker _presenceTracker;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly List<Notification> _pendingNotifications = new();

        public NotificationSaveChangesInterceptor(
            IHubContext<NotificationsHub> hubContext,
            IWebPushService webPushService,
            NotificationPresenceTracker presenceTracker,
            IServiceScopeFactory scopeFactory)
        {
            _hubContext = hubContext;
            _webPushService = webPushService;
            _presenceTracker = presenceTracker;
            _scopeFactory = scopeFactory;
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

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var translationService = scope.ServiceProvider.GetRequiredService<ITranslationService>();

            var userIds = notifications.Select(n => n.UserId).Distinct().ToList();
            var languages = await context.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Language })
                .ToDictionaryAsync(u => u.Id, u => u.Language, cancellationToken);

            foreach (var notification in notifications)
            {
                var language = languages.TryGetValue(notification.UserId, out var lang) ? lang : "sr";

                var translatedTitle = await translationService.GetOrCreateTextAsync(
                    "Notification", notification.Id, "Title", notification.Title, language);
                var translatedMessage = await translationService.GetOrCreateTextAsync(
                    "Notification", notification.Id, "Message", notification.Message, language);

                await _hubContext.Clients
                    .Group(NotificationsHub.GetUserGroupName(notification.UserId))
                    .SendAsync("notificationReceived", MapToDto(notification, translatedTitle, translatedMessage), cancellationToken);

                if (!_presenceTracker.HasActiveConnections(notification.UserId))
                {
                    var pushNotification = new Notification
                    {
                        Id = notification.Id,
                        UserId = notification.UserId,
                        Type = notification.Type,
                        Title = translatedTitle,
                        Message = translatedMessage,
                        ActionUrl = notification.ActionUrl,
                        IsRead = notification.IsRead,
                        ReadAt = notification.ReadAt,
                        EventId = notification.EventId,
                        ReviewId = notification.ReviewId,
                        EventPlannerItemId = notification.EventPlannerItemId,
                        TriggerAtUtc = notification.TriggerAtUtc,
                        CreatedAt = notification.CreatedAt
                    };

                    await _webPushService.SendNotificationAsync(pushNotification, cancellationToken);
                }
            }
        }

        private static NotificationDto MapToDto(Notification notification, string title, string message)
        {
            return new NotificationDto
            {
                Id = notification.Id,
                Type = notification.Type.ToString(),
                Title = title,
                Message = message,
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
