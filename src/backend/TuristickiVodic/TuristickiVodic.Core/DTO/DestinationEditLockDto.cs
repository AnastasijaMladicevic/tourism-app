using System;

namespace TuristickiVodic.Core.DTO
{
    public class DestinationEditLockDto
    {
        public int DestinationId { get; set; }
        public bool IsLocked { get; set; }
        public bool IsOwnedByCurrentUser { get; set; }
        public int? LockedByUserId { get; set; }
        public string? LockedByDisplayName { get; set; }
        public DateTime? AcquiredAtUtc { get; set; }
        public DateTime? ExpiresAtUtc { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
