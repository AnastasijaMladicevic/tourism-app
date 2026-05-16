using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using TuristickiVodic.API.Infrastructure;

namespace TuristickiVodic.API.Hubs
{
    [Authorize]
    public class NotificationsHub : Hub
    {
        private readonly NotificationPresenceTracker _presenceTracker;

        public NotificationsHub(NotificationPresenceTracker presenceTracker)
        {
            _presenceTracker = presenceTracker;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var parsedUserId = int.Parse(userId);
                _presenceTracker.UserConnected(parsedUserId);
                await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(parsedUserId));
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrWhiteSpace(userId) && int.TryParse(userId, out var parsedUserId))
            {
                _presenceTracker.UserDisconnected(parsedUserId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public static string GetUserGroupName(int userId) => $"user-{userId}";
    }
}
