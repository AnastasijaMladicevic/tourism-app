namespace TuristickiVodic.Core.DTO
{
    public class CreateFavoriteDto
    {
        public int? ObjectId { get; set; }
        public int? ActivityId { get; set; }
        public int? DestinationId { get; set; }
        public int? RouteId { get; set; }
        public int? LocationId { get; set; }
    }
}