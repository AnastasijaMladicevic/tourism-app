using NetTopologySuite.Geometries;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace TuristickiVodic.Core.Models;

public class Destinacija
{
    public int Id { get; set; }
    public int IdGrada { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public int IdTipa { get; set; }
    public string? Opis { get; set; }
    public Point Geolokacija { get; set; } = null!;
    public bool Aktivan { get; set; } = true;
    public DateTime Kreirano { get; set; }
    public DateTime Izmenjeno { get; set; }
    public Grad Grad { get; set; } = null!;
    public TipDestinacije TipDestinacije { get; set; } = null!;
    public ICollection<Objekat> Objekti { get; set; } = new List<Objekat>();
    public ICollection<Slika> Slike { get; set; } = new List<Slika>();
}