using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.API.Infrastructure
{
    public class PlannerReminderBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PlannerReminderBackgroundService> _logger;

        public PlannerReminderBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<PlannerReminderBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await GenerateDuePlannerRemindersAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Planner reminder background step failed.");
                }

                await timer.WaitForNextTickAsync(stoppingToken);
            }
        }

        private async Task GenerateDuePlannerRemindersAsync(CancellationToken cancellationToken)
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;
            var reminderWindowEnd = now.AddHours(2);

            var duePlannerItems = await db.EventPlannerItems
                .AsNoTracking()
                .Include(item => item.Event)
                .Where(item =>
                    item.Event.IsActive &&
                    item.Event.Status == ContentStatus.Approved &&
                    item.Event.StartDate > now &&
                    item.Event.StartDate <= reminderWindowEnd)
                .Select(item => new
                {
                    PlannerItemId = item.Id,
                    item.UserId,
                    item.EventId,
                    EventName = item.Event.Name,
                    item.Event.StartDate
                })
                .ToListAsync(cancellationToken);

            if (duePlannerItems.Count == 0)
                return;

            var plannerItemIds = duePlannerItems.Select(item => item.PlannerItemId).ToList();
            var existingReminderKeys = await db.Notifications
                .AsNoTracking()
                .Where(n =>
                    n.Type == NotificationType.PlannerEventReminder2Hours &&
                    n.EventPlannerItemId.HasValue &&
                    plannerItemIds.Contains(n.EventPlannerItemId.Value))
                .Select(n => new
                {
                    n.EventPlannerItemId,
                    n.TriggerAtUtc
                })
                .ToListAsync(cancellationToken);

            var existingKeySet = existingReminderKeys
                .Where(x => x.EventPlannerItemId.HasValue && x.TriggerAtUtc.HasValue)
                .Select(x => $"{x.EventPlannerItemId!.Value}:{x.TriggerAtUtc!.Value.Ticks}")
                .ToHashSet();

            var notifications = duePlannerItems
                .Where(item => !existingKeySet.Contains($"{item.PlannerItemId}:{item.StartDate.AddHours(-2).Ticks}"))
                .Select(item => new Notification
                {
                    UserId = item.UserId,
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

            if (notifications.Count == 0)
                return;

            db.Notifications.AddRange(notifications);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
