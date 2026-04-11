using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace TuristickiVodic.Core.DTO
{
    public class CreateEventDto : IValidatableObject
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }

        public int? MaxVisitors { get; set; }

        [Required]
        public int EventTypeId { get; set; }

        public int? LocalityId { get; set; }

        public int? DestinationId { get; set; }

        public int? ObjectId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (!LocalityId.HasValue && !DestinationId.HasValue)
                yield return new ValidationResult(
                    "Event must have either a LocalityId or a DestinationId.",
                    new[] { nameof(LocalityId), nameof(DestinationId) });

            if (EndDate.HasValue && EndDate.Value < StartDate)
            {
                yield return new ValidationResult(
                    "EndDate cannot be earlier than StartDate.",
                    new[] { nameof(EndDate), nameof(StartDate) });
            }
        }
    }
}
