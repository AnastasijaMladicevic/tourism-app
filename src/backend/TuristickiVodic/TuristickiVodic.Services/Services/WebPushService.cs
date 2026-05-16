using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;
using WebPush;

namespace TuristickiVodic.Services.Services
{
    public class WebPushService : IWebPushService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<WebPushService> _logger;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        public WebPushService(
            IConfiguration configuration,
            ILogger<WebPushService> logger,
            IServiceScopeFactory serviceScopeFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task SendNotificationAsync(Notification notification, CancellationToken cancellationToken = default)
        {
            var publicKey = _configuration["WebPush:PublicKey"]?.Trim();
            var privateKey = _configuration["WebPush:PrivateKey"]?.Trim();
            var subject = _configuration["WebPush:Subject"]?.Trim();

            if (string.IsNullOrWhiteSpace(publicKey) ||
                string.IsNullOrWhiteSpace(privateKey) ||
                string.IsNullOrWhiteSpace(subject))
            {
                return;
            }

            using var scope = _serviceScopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var user = await context.Users
                .AsNoTracking()
                .Where(x => x.Id == notification.UserId)
                .Select(x => new
                {
                    x.AllowPushNotifications
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (user?.AllowPushNotifications != true)
                return;

            var subscriptions = await context.BrowserPushSubscriptions
                .Where(x => x.UserId == notification.UserId)
                .ToListAsync(cancellationToken);

            if (subscriptions.Count == 0)
                return;

            var payload = JsonSerializer.Serialize(new
            {
                title = notification.Title,
                body = notification.Message,
                actionUrl = notification.ActionUrl,
                notificationId = notification.Id,
                type = notification.Type.ToString(),
                tag = $"notification-{notification.Id}"
            });

            var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
            var client = new WebPushClient();
            var staleSubscriptions = new List<BrowserPushSubscription>();

            foreach (var subscription in subscriptions)
            {
                try
                {
                    var pushSubscription = new PushSubscription(
                        subscription.Endpoint,
                        subscription.P256dh,
                        subscription.Auth);

                    await client.SendNotificationAsync(pushSubscription, payload, vapidDetails);
                }
                catch (WebPushException ex) when (
                    ex.StatusCode == System.Net.HttpStatusCode.Gone ||
                    ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    staleSubscriptions.Add(subscription);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Web push send failed for notification {NotificationId} and user {UserId}.",
                        notification.Id,
                        notification.UserId);
                }
            }

            if (staleSubscriptions.Count == 0)
                return;

            context.BrowserPushSubscriptions.RemoveRange(staleSubscriptions);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
