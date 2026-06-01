using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class EventTicketTypeInputDto
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [Range(typeof(decimal), "0", "79228162514264337593543950335")]
        public decimal Price { get; set; }
    }
}
