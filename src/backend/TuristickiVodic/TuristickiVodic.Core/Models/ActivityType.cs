using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Text;

namespace TuristickiVodic.Core.Models
{
    public class ActivityType
    {
        public int Id { get; set; }

        [Required, MaxLength(80)]
        public string Name { get; set; }

        public ICollection<Activity> Activities { get; set; }
    }
}
