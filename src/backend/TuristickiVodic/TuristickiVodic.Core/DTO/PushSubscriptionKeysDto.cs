using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class PushSubscriptionKeysDto
    {
        [Required]
        public string P256dh { get; set; } = string.Empty;

        [Required]
        public string Auth { get; set; } = string.Empty;
    }
}
