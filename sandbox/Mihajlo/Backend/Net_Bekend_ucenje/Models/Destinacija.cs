namespace Net_Bekend_ucenje.Models
{
    public class Destinacija
    {
        public Guid Id { get; set; }
        public string Naziv { get; set; } = string.Empty;
        public string? Opis { get; set; }
        public string Lokacija { get; set; } = string.Empty;
        public string Zemlja { get; set; } = "Srbija";
        public string? UrlSlike { get; set; }
        public Guid KategorijaId { get; set; }
        public decimal ProsecnaOcena { get; set; }
        public int BrojRecenzija { get; set; }
        public DateTime Kreiran { get; set; }
        public DateTime Updejtovan { get; set; }

        public Kategorija Kategorija { get; set; } = null!;
        public ICollection<Recenzija> Recenzije { get; set; } = new List<Recenzija>();
    }
}
