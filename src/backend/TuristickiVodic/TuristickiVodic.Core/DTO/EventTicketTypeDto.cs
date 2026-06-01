namespace TuristickiVodic.Core.DTO
{
    public class EventTicketTypeDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public decimal Price { get; set; }

        public int SortOrder { get; set; }
    }
}
