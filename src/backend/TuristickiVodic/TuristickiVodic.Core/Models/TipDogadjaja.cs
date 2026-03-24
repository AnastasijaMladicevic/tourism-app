using System;
using System.Collections.Generic;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class TipDogadjaja
    {
        public int Id { get; set; }
        public string? Naziv { get; set; } = string.Empty;
        public ICollection<Dogadjaj> Dogadjaji { get; set; } = new List<Dogadjaj>();
    }
}
