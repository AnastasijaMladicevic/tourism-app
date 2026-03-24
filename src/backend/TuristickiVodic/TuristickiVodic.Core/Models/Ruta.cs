namespace TuristickiVodic.Core.Models;

public class Ruta
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public string? Opis { get; set; }
    public string? Tezina { get; set; }
    public decimal? DuzinaKm { get; set; }
    public DateTime Kreirano { get; set; }
    public DateTime Izmenjeno { get; set; }
    public ICollection<RutaTacka> RutaTacke { get; set; } = new List<RutaTacka>();
    public ICollection<Favorit> Favoriti { get; set; } = new List<Favorit>();
}