namespace TuristickiVodic.Services.Services
{
    public class OllamaOptions
    {
        public bool Enabled { get; set; } = true;
        public string BaseUrl { get; set; } = "http://127.0.0.1:11434";
        public string Model { get; set; } = "llama3.2:3b";
        public List<string> FallbackModels { get; set; } =
        [
            "llama3.2:1b",
            "phi3:mini",
            "gemma3:1b",
            "qwen2.5:3b",
            "llama3.1:8b"
        ];
        public int TimeoutSeconds { get; set; } = 90;
    }
}
