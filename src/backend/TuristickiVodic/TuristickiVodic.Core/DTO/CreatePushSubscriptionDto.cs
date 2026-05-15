using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreatePushSubscriptionDto
    {
        [Required]
        public string Endpoint { get; set; } = string.Empty;

        [Required]
        public PushSubscriptionKeysDto Keys { get; set; } = new();

        public long? ExpirationTime { get; set; }
    }
}
