using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateTouristObjectDto : IValidatableObject
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Website { get; set; }

        public string? WorkingHours { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "ObjectTypeId is required.")]
        public int ObjectTypeId { get; set; }

        public int? DestinationId { get; set; }

        public int? LocalityId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (!DestinationId.HasValue && !LocalityId.HasValue)
            {
                yield return new ValidationResult(
                    "Tourist object must have either a DestinationId or a LocalityId.",
                    new[] { nameof(DestinationId), nameof(LocalityId) });
            }

            if ((Longitude.HasValue && !Latitude.HasValue) || (!Longitude.HasValue && Latitude.HasValue))
            {
                yield return new ValidationResult(
                    "Both Longitude and Latitude must be provided together.",
                    new[] { nameof(Longitude), nameof(Latitude) });
            }
        }
    }
}
