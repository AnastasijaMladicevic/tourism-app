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
    }
}
