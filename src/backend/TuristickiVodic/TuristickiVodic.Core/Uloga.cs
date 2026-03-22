namespace TuristickiVodic.Core.Models;

public class Uloga
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public DateTime Kreirano { get; set; }
    public ICollection<Korisnik> Korisnici { get; set; } = new List<Korisnik>();
}