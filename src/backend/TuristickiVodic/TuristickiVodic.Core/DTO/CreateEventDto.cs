using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;
using TuristickiVodic.Core.Validation;

namespace TuristickiVodic.Core.DTO
{
    public class CreateEventDto : IValidatableObject
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
        public double? Longitude { get; set; }

        [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
        public double? Latitude { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public decimal? Price { get; set; }

        public List<EventTicketTypeInputDto>? TicketTypes { get; set; }

        public int? MaxVisitors { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "EventTypeId is required.")]
        public int EventTypeId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "LocalityId must be greater than 0.")]
        public int? LocalityId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "DestinationId must be greater than 0.")]
        public int? DestinationId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "ObjectId must be greater than 0.")]
        public int? ObjectId { get; set; }

        [MaxLength(ValidationLengths.ImageUrl)]
        public string? ImageUrl { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (StartDate == default)
            {
                yield return new ValidationResult(
                    "StartDate is required.",
                    new[] { nameof(StartDate) });
            }

            if (!LocalityId.HasValue && !DestinationId.HasValue)
                yield return new ValidationResult(
                    "Event must have either a LocalityId or a DestinationId.",
                    new[] { nameof(LocalityId), nameof(DestinationId) });

            if ((Longitude.HasValue && !Latitude.HasValue) || (!Longitude.HasValue && Latitude.HasValue))
            {
                yield return new ValidationResult(
                    "Both Longitude and Latitude must be provided together.",
                    new[] { nameof(Longitude), nameof(Latitude) });
            }

            if (EndDate.HasValue && EndDate.Value < StartDate)
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

            if (TicketTypes != null)
            {
                for (var i = 0; i < TicketTypes.Count; i++)
                {
                    var ticketType = TicketTypes[i];
                    if (ticketType == null)
                    {
                        yield return new ValidationResult(
                            "Ticket type entry is required.",
                            new[] { $"{nameof(TicketTypes)}[{i}]" });
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(ticketType.Name))
                    {
                        yield return new ValidationResult(
                            "Ticket type name is required.",
                            new[] { $"{nameof(TicketTypes)}[{i}].{nameof(EventTicketTypeInputDto.Name)}" });
                    }

                    if (ticketType.Name?.Length > 120)
                    {
                        yield return new ValidationResult(
                            "Ticket type name cannot exceed 120 characters.",
                            new[] { $"{nameof(TicketTypes)}[{i}].{nameof(EventTicketTypeInputDto.Name)}" });
                    }

                    if (ticketType.Price < 0)
                    {
                        yield return new ValidationResult(
                            "Ticket type price cannot be negative.",
                            new[] { $"{nameof(TicketTypes)}[{i}].{nameof(EventTicketTypeInputDto.Price)}" });
                    }
                }
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
