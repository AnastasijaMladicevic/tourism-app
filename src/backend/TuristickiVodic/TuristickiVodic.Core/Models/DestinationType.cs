using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class DestinationType
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Name { get; set; }
        // "Stari Grad", "Plaza", "Park"

        public ICollection<Destination> Destinations { get; set; }
    }
}
