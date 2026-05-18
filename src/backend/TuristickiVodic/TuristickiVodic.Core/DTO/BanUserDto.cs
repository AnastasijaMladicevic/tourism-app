using System;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class BanUserDto
    {
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        public DateTime? BanExpiresAtUtc { get; set; }
    }
}
