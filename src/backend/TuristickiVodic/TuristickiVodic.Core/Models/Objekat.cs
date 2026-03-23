using NetTopologySuite.Geometries;

namespace TuristickiVodic.Core.Models;

public class Objekat
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public int IdTipa { get; set; }
    public string? Opis { get; set; }
    public string? Adresa { get; set; }
    public int IdDestinacije { get; set; }
    public Point Geolokacija { get; set; } = null!;
    public string? Telefon { get; set; }
    public string? Sajt { get; set; }
    public string? RadnoVreme { get; set; }
    public decimal ProsecnaOcena { get; set; } = 0;
    public int BrojRecenzija { get; set; } = 0;
    public bool Aktivan { get; set; } = true;
    public DateTime Kreirano { get; set; }
    public DateTime Izmenjeno { get; set; }
    public Destinacija Destinacija { get; set; } = null!;
    public TipObjekta TipObjekta { get; set; } = null!;
    public ICollection<Aktivnost> Aktivnosti { get; set; } = new List<Aktivnost>();
    public ICollection<Dogadjaj> Dogadjaji { get; set; } = new List<Dogadjaj>();
    public ICollection<Recenzija> Recenzije { get; set; } = new List<Recenzija>();
    public ICollection<Favorit> Favoriti { get; set; } = new List<Favorit>();
    public ICollection<KorisnikLog> KorisnikLog { get; set; } = new List<KorisnikLog>();
    public ICollection<KorisnikAktivnost> KorisnikAktivnosti { get; set; } = new List<KorisnikAktivnost>();
    public ICollection<Slika> Slike { get; set; } = new List<Slika>();
}