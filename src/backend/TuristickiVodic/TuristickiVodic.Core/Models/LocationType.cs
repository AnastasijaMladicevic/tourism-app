using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class LocationType
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Name { get; set; }
        // "Grad", "Opstina", "Region"

        public ICollection<Location> Locations { get; set; }
    }
}
