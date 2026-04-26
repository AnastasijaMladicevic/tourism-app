namespace TuristickiVodic.Services.Services
{
    // Temporary provider.
    // Replace this later with Google Translate, DeepL, Azure Translator, or OpenAI.
    public class DummyTranslationProvider : IExternalTranslationProvider
    {
        public Task<string> TranslateAsync(string text, string targetLanguageCode, string sourceLanguageCode = "sr")
        {
            // For testing only, so you can finish backend flow without paying for API.
            return Task.FromResult($"[{targetLanguageCode}] {text}");
        }
    }
}
