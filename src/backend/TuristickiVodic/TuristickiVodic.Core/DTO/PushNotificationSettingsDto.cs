namespace TuristickiVodic.Core.DTO
{
    public class PushNotificationSettingsDto
    {
        public bool Enabled { get; set; }
        public bool HasSubscription { get; set; }
        public string? PublicKey { get; set; }
    }
}
