namespace TuristickiVodic.Core.Models;

public class Korisnik
{
    public int Id { get; set; }
    public string Ime { get; set; } = string.Empty;
    public string Prezime { get; set; } = string.Empty;
    public DateOnly? DatumRodjenja { get; set; }
    public string Email { get; set; } = string.Empty;
    public string LozinkaHash { get; set; } = string.Empty;
    public int IdUloge { get; set; }
    public bool Verifikovan { get; set; } = false;
    public string Jezik { get; set; } = "sr";
    public string? VerifToken { get; set; }
    public DateTime? VerifTokenIstek { get; set; }
    public string? ResetToken { get; set; }
    public DateTime? ResetTokenIstek { get; set; }
    public bool Aktivan { get; set; } = true;
    public DateTime Kreirano { get; set; }
    public DateTime Izmenjeno { get; set; }

    public Uloga Uloga { get; set; } = null!;
    public ICollection<Recenzija> Recenzije { get; set; } = new List<Recenzija>();
    public ICollection<Favorit> Favoriti { get; set; } = new List<Favorit>();
    public ICollection<KorisnikLog> KorisnikLog { get; set; } = new List<KorisnikLog>();
    public ICollection<KorisnikAktivnost> KorisnikAktivnosti { get; set; } = new List<KorisnikAktivnost>();
    public ICollection<Anketa> Ankete { get; set; } = new List<Anketa>();
}