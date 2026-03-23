namespace TuristickiVodic.Core.Models;

public class Anketa
{
    public int Id { get; set; }
    public int IdKorisnika { get; set; }
    public short Ocena { get; set; }
    public string? Komentar { get; set; }
    public DateTime Kreirano { get; set; }
    public Korisnik Korisnik { get; set; } = null!;
}