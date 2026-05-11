using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace TuristickiVodic.Services.Services
{
    public class ArgosTranslateProvider : IExternalTranslationProvider
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ArgosTranslateProvider> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public ArgosTranslateProvider(
            IConfiguration configuration,
            ILogger<ArgosTranslateProvider> logger,
            IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<string> TranslateAsync(
            string text,
            string targetLanguageCode,
            string sourceLanguageCode = "sr")
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            try
            {
                return await TranslateWithPythonAsync(text, targetLanguageCode, sourceLanguageCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Python translation failed. Falling back to HTTP translation for target language {TargetLanguageCode}.",
                    targetLanguageCode);
                return await TranslateWithHttpFallbackAsync(text, targetLanguageCode, sourceLanguageCode);
            }
        }

        private async Task<string> TranslateWithPythonAsync(
            string text,
            string targetLanguageCode,
            string sourceLanguageCode)
        {
            var escapedText = text.Replace("\"", "\\\"");
            var scriptPath = ResolveScriptPath();
            var pythonExecutable = ResolvePythonExecutable();

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = pythonExecutable,
                    Arguments = $"\"{scriptPath}\" \"{escapedText}\" {sourceLanguageCode} {targetLanguageCode}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();

            string result = await process.StandardOutput.ReadToEndAsync();
            string error = await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError(
                    "External translation failed. Python executable: {PythonExecutable}, Script path: {ScriptPath}, Error: {Error}",
                    pythonExecutable,
                    scriptPath,
                    error);
                throw new InvalidOperationException(error);
            }

            return string.IsNullOrWhiteSpace(result) ? text : result.Trim();
        }

        private async Task<string> TranslateWithHttpFallbackAsync(
            string text,
            string targetLanguageCode,
            string sourceLanguageCode)
        {
            var client = _httpClientFactory.CreateClient();
            var requestUri = BuildGoogleTranslateRequestUri(text, sourceLanguageCode, targetLanguageCode);

            using var response = await client.GetAsync(requestUri);
            response.EnsureSuccessStatusCode();

            await using var responseStream = await response.Content.ReadAsStreamAsync();
            using var jsonDocument = await JsonDocument.ParseAsync(responseStream);

            return ParseGoogleTranslateResponse(jsonDocument.RootElement, text);
        }

        private static string BuildGoogleTranslateRequestUri(
            string text,
            string sourceLanguageCode,
            string targetLanguageCode)
        {
            var source = MapLanguageCode(sourceLanguageCode);
            var target = MapLanguageCode(targetLanguageCode);

            return "https://translate.googleapis.com/translate_a/single" +
                   $"?client=gtx&sl={Uri.EscapeDataString(source)}" +
                   $"&tl={Uri.EscapeDataString(target)}" +
                   $"&dt=t&q={Uri.EscapeDataString(text)}";
        }

        private static string ParseGoogleTranslateResponse(JsonElement rootElement, string fallbackText)
        {
            if (rootElement.ValueKind != JsonValueKind.Array || rootElement.GetArrayLength() == 0)
                return fallbackText;

            var segments = rootElement[0];
            if (segments.ValueKind != JsonValueKind.Array)
                return fallbackText;

            var builder = new StringBuilder();

            foreach (var segment in segments.EnumerateArray())
            {
                if (segment.ValueKind != JsonValueKind.Array || segment.GetArrayLength() == 0)
                    continue;

                var translatedPart = segment[0].GetString();
                if (!string.IsNullOrWhiteSpace(translatedPart))
                    builder.Append(translatedPart);
            }

            var translatedText = builder.ToString().Trim();
            return string.IsNullOrWhiteSpace(translatedText) ? fallbackText : translatedText;
        }

        private static string MapLanguageCode(string languageCode)
        {
            var normalized = languageCode.Trim().ToLowerInvariant();

            return normalized switch
            {
                "me" => "sr",
                _ => normalized
            };
        }

        private string ResolveScriptPath()
        {
            var configuredPath = _configuration["Translation:ScriptPath"];
            if (!string.IsNullOrWhiteSpace(configuredPath))
                return configuredPath;

            var publishedPath = Path.Combine(AppContext.BaseDirectory, "translate.py");
            if (File.Exists(publishedPath))
                return publishedPath;

            _logger.LogWarning("translate.py was not found at expected publish path: {PublishedPath}", publishedPath);
            return publishedPath;
        }

        private string ResolvePythonExecutable()
        {
            var configuredExecutable = _configuration["Translation:PythonExecutable"];
            if (!string.IsNullOrWhiteSpace(configuredExecutable))
                return configuredExecutable;

            return OperatingSystem.IsWindows() ? "python" : "python3";
        }
    }
}
