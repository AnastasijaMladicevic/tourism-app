namespace TuristickiVodic.Services.Services
{
    public interface ITranslationService
    {
        Task<string> GetTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode);

        Task<string> GetOrCreateTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode);

        Task GenerateIfMissingAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            IEnumerable<string> targetLanguages);

        /// <summary>
        /// Reads a cached translation without calling the external translation provider.
        /// Returns null if no cached translation exists (or the language is "sr").
        /// </summary>
        Task<string?> TryGetCachedTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string languageCode)
            => Task.FromResult<string?>(null);

        /// <summary>
        /// Calls the external translation provider only, without reading or writing the cache.
        /// Safe to run concurrently for multiple texts since it does not touch the DbContext.
        /// </summary>
        Task<string> TranslateExternalAsync(string originalText, string languageCode)
            => Task.FromResult(originalText);

        /// <summary>
        /// Persists a translation produced by <see cref="TranslateExternalAsync"/> into the cache.
        /// </summary>
        Task PersistTranslationAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode,
            string translatedText)
            => Task.CompletedTask;
    }
}
