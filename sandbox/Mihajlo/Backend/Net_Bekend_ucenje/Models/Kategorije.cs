namespace Net_Bekend_ucenje.Models
{
    public class Kategorije
    {
        public Guid Id { get; set; }
        public string Naziv { get; set; } = string.Empty;
        public string? Ikonica { get; set; }
        public DateTime Kreiran { get; set; }

        public ICollection<Destinacija> Destinacije { get; set; } = new List<Destinacija>();
    }
}
