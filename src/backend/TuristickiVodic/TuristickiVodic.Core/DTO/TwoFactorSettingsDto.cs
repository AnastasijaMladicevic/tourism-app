namespace TuristickiVodic.Core.DTO
{
    public class TwoFactorSettingsDto
    {
        public bool IsEnabled { get; set; }
        public string DeliveryMethod { get; set; } = "email";
        public string? MaskedEmailAddress { get; set; }
    }
}
