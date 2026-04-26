namespace TuristickiVodic.Services.Services
{
    public interface IExternalTranslationProvider
    {
        Task<string> TranslateAsync(string text, string targetLanguageCode, string sourceLanguageCode = "sr");
    }
}
