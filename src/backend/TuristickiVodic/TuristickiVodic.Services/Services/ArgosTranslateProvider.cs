using System.Diagnostics;
using System.Text;

namespace TuristickiVodic.Services.Services
{
    public class ArgosTranslateProvider : IExternalTranslationProvider
    {
        public async Task<string> TranslateAsync(
            string text,
            string targetLanguageCode,
            string sourceLanguageCode = "sr")
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = $"translate.py \"{text}\" {sourceLanguageCode} {targetLanguageCode}",
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

            process.WaitForExit();

            if (!string.IsNullOrWhiteSpace(error))
                throw new Exception(error);

            return string.IsNullOrWhiteSpace(result) ? text : result.Trim();
        }
    }
}