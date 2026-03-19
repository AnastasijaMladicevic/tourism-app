namespace DemoAPI.Models
{
    public class Book
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string ISBN { get; set; } = string.Empty;
        public int YearPublished { get; set; }
        public string Genre { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public double Rating { get; set; }
        public DateTime AddedDate { get; set; } = DateTime.UtcNow;
    }
}
