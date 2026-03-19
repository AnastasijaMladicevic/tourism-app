using System.ComponentModel.DataAnnotations;

namespace FootballPlayersDemo.Api.Models;

public class Player
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Club { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Position { get; set; } = string.Empty;

    [Range(1, 99)]
    public int JerseyNumber { get; set; }

    [Range(15, 45)]
    public int Age { get; set; }
}
