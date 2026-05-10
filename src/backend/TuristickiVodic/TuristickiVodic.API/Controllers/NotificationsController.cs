using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Services.Services;

namespace TuristickiVodic.API.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMy([FromQuery] NotificationQueryDto query)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var notifications = await _notificationService.GetMyAsync(userId, query);
            return Ok(notifications);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(new NotificationUnreadCountDto
            {
                UnreadCount = count
            });
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var updated = await _notificationService.MarkAsReadAsync(id, userId);

            if (!updated)
                return NotFound(new { message = "Notification not found or does not belong to you." });

            return NoContent();
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var updatedCount = await _notificationService.MarkAllAsReadAsync(userId);
            return Ok(new
            {
                updatedCount
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRead(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var deleted = await _notificationService.DeleteReadAsync(id, userId);

            if (!deleted)
                return NotFound(new { message = "Read notification not found or does not belong to you." });

            return NoContent();
        }

        [HttpDelete("read")]
        public async Task<IActionResult> DeleteAllRead()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var deletedCount = await _notificationService.DeleteAllReadAsync(userId);
            return Ok(new
            {
                deletedCount
            });
        }
    }
}
