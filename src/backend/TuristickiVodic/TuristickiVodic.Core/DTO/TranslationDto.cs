namespace TuristickiVodic.Core.DTO
{
    public class TranslationDto
    {
        public int Id { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public string LanguageCode { get; set; } = string.Empty;
        public string TranslatedText { get; set; } = string.Empty;
        public bool IsAutoTranslated { get; set; }
    }
}
