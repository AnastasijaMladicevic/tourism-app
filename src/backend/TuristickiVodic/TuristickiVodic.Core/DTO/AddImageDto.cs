using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    /// <summary>
    /// Koristi se kada se slika dodaje konkretnom entitetu putem nested rute
    /// (npr. POST /api/destinations/{id}/images). 
    /// Entity ID dolazi iz URL-a, ne iz body-ja.
    /// </summary>
    public class AddImageDto
    {
        [Required, MaxLength(500)]
        public string Url { get; set; }

        [MaxLength(200)]
        public string? AltText { get; set; }

        public bool IsMain { get; set; }
    }
}
