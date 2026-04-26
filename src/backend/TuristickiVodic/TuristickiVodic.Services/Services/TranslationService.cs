using TuristickiVodic.Core.Helpers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class TranslationService : ITranslationService
    {
        private readonly AppDbContext _context;
        private readonly IExternalTranslationProvider _translationProvider;

        public TranslationService(
            AppDbContext context,
            IExternalTranslationProvider translationProvider)
        {
            _context = context;
            _translationProvider = translationProvider;
        }

        public async Task<string> GetTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode)
        {
            var normalizedLanguage = LanguageHelper.Normalize(languageCode);
            if (normalizedLanguage == "sr")
                return originalText;

            var translation = await _context.Translations
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.EntityType == entityType &&
                    t.EntityId == entityId &&
                    t.FieldName == fieldName &&
                    t.LanguageCode == normalizedLanguage);

            return translation?.TranslatedText ?? originalText;
        }

        public async Task<string> GetOrCreateTextAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            string languageCode)
        {
            if (string.IsNullOrWhiteSpace(originalText))
                return originalText;

            var normalizedLanguage = LanguageHelper.Normalize(languageCode);
            if (normalizedLanguage == "sr")
                return originalText;

            var translation = await _context.Translations
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.EntityType == entityType &&
                    t.EntityId == entityId &&
                    t.FieldName == fieldName &&
                    t.LanguageCode == normalizedLanguage);

            if (translation != null)
                return translation.TranslatedText;

            try
            {
                var translated = await _translationProvider.TranslateAsync(originalText, normalizedLanguage, "sr");

                if (string.IsNullOrWhiteSpace(translated))
                    return originalText;

                _context.Translations.Add(new Translation
                {
                    EntityType = entityType,
                    EntityId = entityId,
                    FieldName = fieldName,
                    LanguageCode = normalizedLanguage,
                    OriginalTextHash = HashText(originalText),
                    TranslatedText = translated,
                    IsAutoTranslated = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                return translated;
            }
            catch
            {
                return originalText;
            }
        }

        public async Task GenerateIfMissingAsync(
            string entityType,
            int entityId,
            string fieldName,
            string originalText,
            IEnumerable<string> targetLanguages)
        {
            if (string.IsNullOrWhiteSpace(originalText))
                return;

            var normalizedLanguages = targetLanguages
                .Where(lang => !string.IsNullOrWhiteSpace(lang))
                .Select(LanguageHelper.Normalize)
                .Where(lang => lang != "sr")
                .Distinct()
                .ToList();

            foreach (var lang in normalizedLanguages)
            {
                var exists = await _context.Translations.AnyAsync(t =>
                    t.EntityType == entityType &&
                    t.EntityId == entityId &&
                    t.FieldName == fieldName &&
                    t.LanguageCode == lang);

                if (exists)
                    continue;

                var translated = await _translationProvider.TranslateAsync(originalText, lang, "sr");

                _context.Translations.Add(new Translation
                {
                    EntityType = entityType,
                    EntityId = entityId,
                    FieldName = fieldName,
                    LanguageCode = lang,
                    OriginalTextHash = HashText(originalText),
                    TranslatedText = translated,
                    IsAutoTranslated = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
            }
        }

        private static string HashText(string text)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(text));
            return Convert.ToHexString(bytes);
        }
    }
}
