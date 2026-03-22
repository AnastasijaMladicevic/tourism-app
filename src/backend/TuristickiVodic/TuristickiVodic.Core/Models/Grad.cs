namespace TuristickiVodic.Core.Models;

public class Grad
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public string? Opis { get; set; }
    public bool Aktivan { get; set; } = true;
    public DateTime Kreirano { get; set; }
    public ICollection<Destinacija> Destinacije { get; set; } = new List<Destinacija>();
    public ICollection<Slika> Slike { get; set; } = new List<Slika>();
}