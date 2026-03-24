using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class TipObjekta
    {
        public int Id { get; set; }
        public string Naziv { get; set; } = string.Empty;
        public ICollection<Objekat> Objekti { get; set; } = new List<Objekat>();

    }
}
