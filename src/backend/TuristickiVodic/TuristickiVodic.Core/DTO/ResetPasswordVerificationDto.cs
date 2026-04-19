namespace TuristickiVodic.Core.DTO
{
    public class ResetPasswordVerificationDto
    {
        public string ResetSessionToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }
}
