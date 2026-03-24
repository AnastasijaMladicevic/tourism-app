using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.Models;

public class KorisnikAktivnost
{
    public int Id { get; set; }
    public int IdKorisnika { get; set; }
    public int IdAktivnosti { get; set; }
    public DateTime Kreirano { get; set; }
    public Korisnik Korisnik { get; set; } = null!;
    public Aktivnost Aktivnost { get; set; } = null!;
}