using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateDestinationDto : IValidatableObject
    {
        [MaxLength(150)]
        public string? Name { get; set; }

        [MaxLength(250)]
        public string? DisplayTitle { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "DestinationTypeId must be greater than 0.")]
        public int? DestinationTypeId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "RegionId must be greater than 0.")]
        public int? RegionId { get; set; }

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
