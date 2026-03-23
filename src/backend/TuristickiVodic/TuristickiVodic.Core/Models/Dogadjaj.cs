namespace TuristickiVodic.Core.Models;

public class Dogadjaj
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public int IdTipa { get; set; }
    public string? Opis { get; set; }
    public DateTime DatumPocetak { get; set; }
    public DateTime? DatumKraj { get; set; }
    public int IdObjekta { get; set; }
    public decimal? Cena { get; set; }
    public int? MaxPosetilaca { get; set; }
    public bool Aktivan { get; set; } = true;
    public DateTime Kreirano { get; set; }
    public DateTime Izmenjeno { get; set; }
    public Objekat Objekat { get; set; } = null!;
    public TipDogadjaja TipDogadjaja { get; set; } = null!;
    public ICollection<Favorit> Favoriti { get; set; } = new List<Favorit>();
}