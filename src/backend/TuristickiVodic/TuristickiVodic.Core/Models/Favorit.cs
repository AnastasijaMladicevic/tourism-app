namespace TuristickiVodic.Core.Models;

public class Favorit
{
    public int Id { get; set; }
    public int IdKorisnika { get; set; }
    public int? IdObjekta { get; set; }
    public int? IdRute { get; set; }
    public int? IdDogadjaja { get; set; }
    public DateTime Kreirano { get; set; }
    public Korisnik Korisnik { get; set; } = null!;
    public Objekat? Objekat { get; set; }
    public Ruta? Ruta { get; set; }
    public Dogadjaj? Dogadjaj { get; set; }
}