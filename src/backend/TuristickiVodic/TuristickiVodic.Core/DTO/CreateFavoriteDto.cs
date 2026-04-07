using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class CreateFavoriteDto : IValidatableObject
    {
        public int? ObjectId { get; set; }
        public int? ActivityId { get; set; }
        public int? DestinationId { get; set; }
        public int? RouteId { get; set; }
        public int? LocalityId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var filledCount = (ObjectId.HasValue ? 1 : 0)
                            + (ActivityId.HasValue ? 1 : 0)
                            + (DestinationId.HasValue ? 1 : 0)
                            + (RouteId.HasValue ? 1 : 0)
                            + (LocalityId.HasValue ? 1 : 0);

            if (filledCount != 1)
            {
                yield return new ValidationResult(
                    "Tačno jedno od polja ObjectId, ActivityId, DestinationId, RouteId ili LocalityId mora biti popunjeno.",
                    new[] { nameof(ObjectId), nameof(ActivityId), nameof(DestinationId), nameof(RouteId), nameof(LocalityId) });
            }
        }
    }
}
