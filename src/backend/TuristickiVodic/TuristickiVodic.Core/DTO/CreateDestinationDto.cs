using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateDestinationDto : IValidatableObject
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? DisplayTitle { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "DestinationTypeId is required.")]
        public int DestinationTypeId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "RegionId is required.")]
        public int RegionId { get; set; } = 1;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "ManagedByUserId mora biti validan ID menadžera (vrednost >= 1).")]
        public int? ManagedByUserId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if ((Longitude.HasValue && !Latitude.HasValue) || (!Longitude.HasValue && Latitude.HasValue))
            {
                yield return new ValidationResult(
                    "Both Longitude and Latitude must be provided together.",
                    new[] { nameof(Longitude), nameof(Latitude) });
            }
        }
    }
}
