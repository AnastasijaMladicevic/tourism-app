using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class KorisnikLog
    {
        public long Id { get; set; }

        public int? IdKorisnika { get; set; }
        public string? SesijaId { get; set; }

        public int? IdObjekta { get; set; }

        public string Akcija { get; set; } = null!;

        public int? TrajanjeSec { get; set; }

        public DateTime Kreirano { get; set; }

        public Korisnik? Korisnik { get; set; }
        public Objekat? Objekat { get; set; }
    }
}
