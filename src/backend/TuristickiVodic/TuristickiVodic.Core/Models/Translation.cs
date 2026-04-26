namespace TuristickiVodic.Core.Models
{
    public class Translation
    {
        public int Id { get; set; }

        // Example: "Object", "Destination", "Locality", "Event", "Activity"
        public string EntityType { get; set; } = string.Empty;

        // Id from the original table
        public int EntityId { get; set; }

        // Example: "Name", "Description", "Title"
        public string FieldName { get; set; } = string.Empty;

        // Example: "es", "it", "el", "me"
        public string LanguageCode { get; set; } = string.Empty;

        // Optional: used later to know if original text changed
        public string? OriginalTextHash { get; set; }

        public string TranslatedText { get; set; } = string.Empty;

        public bool IsAutoTranslated { get; set; } = true;

        public int? ReviewedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
