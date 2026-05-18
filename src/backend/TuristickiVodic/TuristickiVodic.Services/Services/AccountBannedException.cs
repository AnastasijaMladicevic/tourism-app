using System;

namespace TuristickiVodic.Services
{
    public class AccountBannedException : InvalidOperationException
    {
        public AccountBannedException(string message, string? reason, DateTime? expiresAtUtc, string? roleName)
            : base(message)
        {
            Reason = reason;
            ExpiresAtUtc = expiresAtUtc;
            RoleName = roleName;
        }

        public string? Reason { get; }
        public DateTime? ExpiresAtUtc { get; }
        public string? RoleName { get; }
    }
}
