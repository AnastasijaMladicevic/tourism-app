using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface INotificationService
    {
        Task<PagedResultDto<NotificationDto>> GetMyAsync(int userId, NotificationQueryDto query);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int id, int userId);
        Task<int> MarkAllAsReadAsync(int userId);
        Task<bool> DeleteReadAsync(int id, int userId);
        Task<int> DeleteAllReadAsync(int userId);
    }
}
