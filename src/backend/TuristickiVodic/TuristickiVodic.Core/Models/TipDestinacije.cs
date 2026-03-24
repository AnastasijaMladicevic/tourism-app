using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class TipDestinacije
    {
        public int Id { get; set; }
        public string Naziv { get; set; } = string.Empty;
        public ICollection<Destinacija> Destinacije { get; set; } = new List<Destinacija>();
    }
}
