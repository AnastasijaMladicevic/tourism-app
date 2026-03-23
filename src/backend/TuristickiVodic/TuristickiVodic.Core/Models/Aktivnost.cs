namespace TuristickiVodic.Core.Models;

public class Aktivnost
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public int IdTipa { get; set; }
    public string? Opis { get; set; }
    public int IdObjekta { get; set; }
    public decimal? Cena { get; set; }
    public int? Trajanje { get; set; }
    public DateTime Kreirano { get; set; }
    public DateTime Izmenjeno { get; set; }
    public Objekat Objekat { get; set; } = null!;
    public TipAktivnosti TipAktivnosti { get; set; } = null!;
    public ICollection<KorisnikAktivnost> KorisnikAktivnosti { get; set; } = new List<KorisnikAktivnost>();
}