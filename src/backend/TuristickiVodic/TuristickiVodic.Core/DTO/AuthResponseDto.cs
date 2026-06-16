namespace TuristickiVodic.Core.DTO
{
    public class AuthResponseDto
    {
        public string? Token { get; set; }
        public string? RefreshToken { get; set; }
        public UserDto? User { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsBanned { get; set; }
        public string? BanMessage { get; set; }
        public string? BanReason { get; set; }
        public DateTime? BanExpiresAtUtc { get; set; }
        public bool RequiresTwoFactor { get; set; }
        public string? TwoFactorChallengeToken { get; set; }
        public DateTime? TwoFactorExpiresAt { get; set; }
        public string? TwoFactorDeliveryTarget { get; set; }
        public bool RequiresEmailVerification { get; set; }
        public string? EmailVerificationDeliveryTarget { get; set; }
    }
}
