using System.Collections.Concurrent;

namespace TuristickiVodic.API.Infrastructure
{
    public class NotificationPresenceTracker
    {
        private readonly ConcurrentDictionary<int, int> _activeConnections = new();

        public void UserConnected(int userId)
        {
            _activeConnections.AddOrUpdate(userId, 1, (_, current) => current + 1);
        }

        public void UserDisconnected(int userId)
        {
            while (true)
            {
                if (!_activeConnections.TryGetValue(userId, out var current))
                    return;

                if (current <= 1)
                {
                    if (_activeConnections.TryRemove(userId, out _))
                        return;

                    continue;
                }

                if (_activeConnections.TryUpdate(userId, current - 1, current))
                    return;
            }
        }

        public bool HasActiveConnections(int userId)
        {
            return _activeConnections.TryGetValue(userId, out var count) && count > 0;
        }
    }
}
