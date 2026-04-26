namespace TuristickiVodic.Services.Services
{
    internal sealed class NullTranslationService : ITranslationService
    {
        public static ITranslationService Instance { get; } = new NullTranslationService();

        private NullTranslationService()
        {
        }

        public Task<string> GetTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode)
        {
            return Task.FromResult(originalText);
        }

        public Task<string> GetOrCreateTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode)
        {
            return Task.FromResult(originalText);
        }

        public Task GenerateIfMissingAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            IEnumerable<string> targetLanguages)
        {
            return Task.CompletedTask;
        }
    }
}
