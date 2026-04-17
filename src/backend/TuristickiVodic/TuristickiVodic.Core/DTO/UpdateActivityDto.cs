using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateActivityDto : IValidatableObject
    {
        [MaxLength(150)]
        public string? Name { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        public decimal? Price { get; set; }

        public int? DurationMinutes { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "ActivityTypeId must be greater than 0.")]
        public int? ActivityTypeId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "LocalityId must be greater than 0.")]
        public int? LocalityId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "DestinationId must be greater than 0.")]
        public int? DestinationId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "ObjectId must be greater than 0.")]
        public int? ObjectId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if ((Longitude.HasValue && !Latitude.HasValue) || (!Longitude.HasValue && Latitude.HasValue))
                yield return new ValidationResult(
                    "Both Longitude and Latitude must be provided together.",
                    new[] { nameof(Longitude), nameof(Latitude) });

            if (Price.HasValue && Price.Value < 0)
                yield return new ValidationResult(
                    "Price cannot be negative.",
                    new[] { nameof(Price) });

            if (DurationMinutes.HasValue && DurationMinutes.Value <= 0)
                yield return new ValidationResult(
                    "DurationMinutes must be greater than 0.",
                    new[] { nameof(DurationMinutes) });
        }
    }
}
