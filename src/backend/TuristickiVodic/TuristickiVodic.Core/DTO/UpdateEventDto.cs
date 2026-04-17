using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class UpdateEventDto : IValidatableObject
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }

        public int? MaxVisitors { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "EventTypeId must be greater than 0.")]
        public int? EventTypeId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "LocalityId must be greater than 0.")]
        public int? LocalityId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "DestinationId must be greater than 0.")]
        public int? DestinationId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "ObjectId must be greater than 0.")]
        public int? ObjectId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if ((Longitude.HasValue && !Latitude.HasValue) || (!Longitude.HasValue && Latitude.HasValue))
            {
                yield return new ValidationResult(
                    "Both Longitude and Latitude must be provided together.",
                    new[] { nameof(Longitude), nameof(Latitude) });
            }

            if (StartDate.HasValue && EndDate.HasValue && EndDate.Value < StartDate.Value)
            {
                yield return new ValidationResult(
                    "EndDate cannot be earlier than StartDate.",
                    new[] { nameof(EndDate), nameof(StartDate) });
            }

            if (Price.HasValue && Price.Value < 0)
            {
                yield return new ValidationResult(
                    "Price cannot be negative.",
                    new[] { nameof(Price) });
            }

            if (MaxVisitors.HasValue && MaxVisitors.Value <= 0)
            {
                yield return new ValidationResult(
                    "MaxVisitors must be greater than 0.",
                    new[] { nameof(MaxVisitors) });
            }
        }
    }
}
