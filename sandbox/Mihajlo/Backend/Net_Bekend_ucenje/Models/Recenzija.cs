namespace Net_Bekend_ucenje.Models
{
    public class Recenzija
    {
        public Guid Id { get; set; }
        public Guid DestinacijaId { get; set; }
        public string AutorNaziv { get; set; } = string.Empty;
        public short Ocena { get; set; }
        public string? Komentar { get; set; }
        public DateTime Kreiran { get; set; }

        public Destinacija Destinacija { get; set; } = null!;
    }
}
