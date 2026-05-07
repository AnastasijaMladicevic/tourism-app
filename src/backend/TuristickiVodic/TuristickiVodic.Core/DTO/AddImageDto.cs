using System.ComponentModel.DataAnnotations;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    /// <summary>
    /// Koristi se kada se slika dodaje konkretnom entitetu putem nested rute
    /// (npr. POST /api/destinations/{id}/images). 
    /// Entity ID dolazi iz URL-a, ne iz body-ja.
    /// Fajl se šalje kao multipart/form-data.
    /// </summary>
    public class AddImageDto
    {
        [Required]
        public IFormFile File { get; set; }

        [MaxLength(ValidationLengths.ImageAltText)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; }
    }
}
