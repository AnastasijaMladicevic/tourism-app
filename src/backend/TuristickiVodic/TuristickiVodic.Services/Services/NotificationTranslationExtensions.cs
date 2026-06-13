namespace TuristickiVodic.Services.Services
{
    /// <summary>
    /// Helper for translating notification title/message text (written in Serbian)
    /// into the recipient's preferred language before it is stored.
    /// </summary>
    public static class NotificationTranslationExtensions
    {
        public static async Task<(string Title, string Message)> TranslateNotificationAsync(
            this ITranslationService translationService,
            string title,
            string message,
            string languageCode)
        {
            var translatedTitle = await translationService.TranslateExternalAsync(title, languageCode);
            var translatedMessage = await translationService.TranslateExternalAsync(message, languageCode);
            return (translatedTitle, translatedMessage);
        }
    }
}
