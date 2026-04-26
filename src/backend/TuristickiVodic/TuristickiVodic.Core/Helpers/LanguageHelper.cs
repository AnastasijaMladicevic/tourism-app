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

            // Crnogorski i srpski su isti jezik za svrhe prevoda
            if (normalized == "me")
                return "sr";

            return normalized;
        }
    }
}
