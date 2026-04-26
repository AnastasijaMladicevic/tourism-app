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
            if (string.IsNullOrWhiteSpace(languageCode) || languageCode == "sr")
                return originalText;

            // Crnogorski fallback: ako nema posebnog prevoda, koristi srpski/original.
            if (languageCode == "me")
                return originalText;

            var translation = await _context.Translations
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.EntityType == entityType &&
                    t.EntityId == entityId &&
                    t.FieldName == fieldName &&
                    t.LanguageCode == languageCode);

            return translation?.TranslatedText ?? originalText;
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

            foreach (var lang in targetLanguages.Distinct())
            {
                if (lang == "sr" || lang == "me")
                    continue;

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
