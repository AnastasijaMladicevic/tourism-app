namespace TuristickiVodic.Core.Models;

public class Recenzija
{
    public int Id { get; set; }
    public int IdKorisnika { get; set; }
    public int IdObjekta { get; set; }
    public short Ocena { get; set; }
    public string Tekst { get; set; } = string.Empty;
    public bool Odobrena { get; set; } = false;
    public DateTime Kreirana { get; set; }
    public Korisnik Korisnik { get; set; } = null!;
    public Objekat Objekat { get; set; } = null!;
}