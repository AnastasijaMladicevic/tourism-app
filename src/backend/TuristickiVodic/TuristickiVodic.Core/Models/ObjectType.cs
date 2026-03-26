using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class ObjectType
    {
        public int Id { get; set; }

        [Required, MaxLength(80)]
        public string Name { get; set; }
        // "Hotel", "Restoran", "Pumpa"

        public ICollection<TouristObject> Objects { get; set; }
    }
}
