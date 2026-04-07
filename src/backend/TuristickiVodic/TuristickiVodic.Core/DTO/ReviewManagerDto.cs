using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class ReviewManagerReportDto : IValidatableObject
    {
        public bool Approve { get; set; }
        public string? RejectionReason { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (!Approve && string.IsNullOrWhiteSpace(RejectionReason))
            {
                yield return new ValidationResult(
                    "RejectionReason is required when rejecting a report.",
                    new[] { nameof(RejectionReason) });
            }
        }
    }
}