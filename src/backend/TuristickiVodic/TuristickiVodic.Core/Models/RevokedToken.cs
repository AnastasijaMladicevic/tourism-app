using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class RevokedToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Jti { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public DateTime RevokedAt { get; set; } = DateTime.UtcNow;
    }
}