namespace TuristickiVodic.Services.Services
{
    public readonly record struct TranslationBatchItem(string EntityType, int EntityId, string FieldName, string OriginalText);

    /// <summary>
    /// Translates a batch of texts in one go, running the slow external-translation calls for
    /// cache misses in parallel instead of one-by-one. DbContext-bound cache reads/writes stay
    /// sequential since DbContext is not thread-safe.
    /// </summary>
    public static class TranslationBatchHelper
    {
        public static async Task<string[]> TranslateBatchAsync(
            this ITranslationService translationService,
            List<TranslationBatchItem> items,
            string normalizedLang)
        {
            var results = new string[items.Count];
            var pendingIndexes = new List<int>();

            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                if (string.IsNullOrWhiteSpace(item.OriginalText))
                {
                    results[i] = item.OriginalText;
                    continue;
                }

                var cached = await translationService.TryGetCachedTextAsync(item.EntityType, item.EntityId, item.FieldName, normalizedLang);
                if (cached != null)
                {
                    results[i] = cached;
                }
                else
                {
                    pendingIndexes.Add(i);
                }
            }

            if (pendingIndexes.Count > 0)
            {
                var translateTasks = pendingIndexes
                    .Select(i => translationService.TranslateExternalAsync(items[i].OriginalText, normalizedLang))
                    .ToArray();

                var translated = await Task.WhenAll(translateTasks);

                for (var idx = 0; idx < pendingIndexes.Count; idx++)
                {
                    var i = pendingIndexes[idx];
                    results[i] = translated[idx];

                    await translationService.PersistTranslationAsync(
                        items[i].EntityType, items[i].EntityId, items[i].FieldName, items[i].OriginalText, normalizedLang, translated[idx]);
                }
            }

            return results;
        }
    }
}
