namespace TuristickiVodic.Core.DTO
{
    public class UpdateDestinationDto
    {
        public string? Name { get; set; }

        public string? Description { get; set; }

        public double? Longitude { get; set; }

        public double? Latitude { get; set; }

        public int? DestinationTypeId { get; set; }
    }
}