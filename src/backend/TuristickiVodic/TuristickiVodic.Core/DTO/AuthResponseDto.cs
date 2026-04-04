namespace TuristickiVodic.Core.DTO
{
    public class AuthResponseDto
    {
        public string Token { get; set; }
        public string RefreshToken { get; set; }
        public UserDto User { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}