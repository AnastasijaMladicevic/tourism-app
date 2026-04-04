using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateDestinationDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        [Required]
        public int DestinationTypeId { get; set; }

        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Obavezno – destinacija ne može da se kreira bez dodeljenog menadžera.
        /// </summary>
        [Required]
        public int ManagedByUserId { get; set; }
    }
}