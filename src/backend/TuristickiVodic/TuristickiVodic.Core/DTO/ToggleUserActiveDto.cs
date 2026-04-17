using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public enum UserAccountState
    {
        Active = 1,
        Inactive = 2
    }

    public class ToggleUserActiveDto
    {
        [Required]
        public UserAccountState? State { get; set; }
    }
}
