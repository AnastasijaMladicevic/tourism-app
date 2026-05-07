using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateImageDto
    {
        // URL se više ne menja direktno - slika se briše i dodaje nova
        // Ostavljamo samo AltText i IsMain kao editabilna polja

        [MaxLength(ValidationLengths.ImageAltText)]
        public string? AltText { get; set; }

        public bool? IsMain { get; set; }
    }
}
