using TuristickiVodic.Core.Models;

namespace TuristickiVodic.Services.Services
{
    public interface IWebPushService
    {
        Task SendNotificationAsync(Notification notification, CancellationToken cancellationToken = default);
    }
}
