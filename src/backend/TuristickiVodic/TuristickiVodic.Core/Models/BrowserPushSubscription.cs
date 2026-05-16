using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class BrowserPushSubscription
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [Required, MaxLength(2000)]
        public string Endpoint { get; set; } = string.Empty;

        [Required, MaxLength(512)]
        public string P256dh { get; set; } = string.Empty;

        [Required, MaxLength(256)]
        public string Auth { get; set; } = string.Empty;

        public DateTime? ExpirationTimeUtc { get; set; }

        [MaxLength(20)]
        public string? Language { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
