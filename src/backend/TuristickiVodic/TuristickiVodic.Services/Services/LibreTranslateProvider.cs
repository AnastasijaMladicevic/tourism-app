using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace TuristickiVodic.Services.Services
{
    public class LibreTranslateProvider : IExternalTranslationProvider
    {
        private readonly HttpClient _httpClient;

        public LibreTranslateProvider(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<string> TranslateAsync(
            string text,
            string targetLanguageCode,
            string sourceLanguageCode = "sr")
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            var request = new LibreTranslateRequest
            {
                Q = text,
                Source = "auto",
                Target = MapLanguage(targetLanguageCode),
                Format = "text"
            };

            var response = await _httpClient.PostAsJsonAsync("/translate", request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new Exception($"LibreTranslate failed: {response.StatusCode} - {error}");
            }

            var result = await response.Content.ReadFromJsonAsync<LibreTranslateResponse>();

            return result?.TranslatedText ?? text;
        }

        private static string MapLanguage(string lang)
        {
            return lang.ToLower() switch
            {
                "sr" => "sr",
                "me" => "sr",
                "it" => "it",
                "es" => "es",
                "el" => "el",
                _ => lang.ToLower()
            };
        }

        private class LibreTranslateRequest
        {
            [JsonPropertyName("q")]
            public string Q { get; set; } = string.Empty;

            [JsonPropertyName("source")]
            public string Source { get; set; } = "sr";

            [JsonPropertyName("target")]
            public string Target { get; set; } = string.Empty;

            [JsonPropertyName("format")]
            public string Format { get; set; } = "text";
        }

        private class LibreTranslateResponse
        {
            [JsonPropertyName("translatedText")]
            public string TranslatedText { get; set; } = string.Empty;
        }
    }
}