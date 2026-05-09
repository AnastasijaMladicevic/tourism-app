namespace TuristickiVodic.Core.Helpers
{
    public static class LanguageHelper
    {
        /// <summary>
        /// Normalizuje jezik koda. Crnogorski ("me") se tretira kao srpski ("sr")
        /// jer dele isti sadržaj i prevode. Nepoznat/prazan jezik defaultuje na "sr".
        /// </summary>
        public static string Normalize(string? lang)
        {
            if (string.IsNullOrWhiteSpace(lang))
                return "sr";

            var normalized = lang.Trim().ToLowerInvariant();
            var dashIndex = normalized.IndexOf('-');
            if (dashIndex > 0)
                normalized = normalized[..dashIndex];

            var underscoreIndex = normalized.IndexOf('_');
            if (underscoreIndex > 0)
                normalized = normalized[..underscoreIndex];

            // Crnogorski i srpski su isti jezik za svrhe prevoda
            if (normalized == "me" || normalized == "cnr" || normalized == "srp" || normalized == "sr")
                return "sr";

            if (normalized == "eng")
                return "en";

            if (normalized == "spa")
                return "es";

            if (normalized == "ita")
                return "it";

            return normalized;
        }
    }
}
