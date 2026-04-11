namespace TuristickiVodic.Core.DTO
{
    public class UpdateActivityDto
    {
        public string? Name { get; set; }

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public decimal? Price { get; set; }

        public int? DurationMinutes { get; set; }

        public int? ActivityTypeId { get; set; }

        public int? LocalityId { get; set; }

        public int? DestinationId { get; set; }

        public int? ObjectId { get; set; }
    }
}