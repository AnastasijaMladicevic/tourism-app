using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.Models
{
    public class Role
    {
        public int Id { get; set; }

        [Required]
        public RoleType Name { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<User> Users { get; set; }
    }
}