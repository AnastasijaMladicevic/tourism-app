namespace TuristickiVodic.Core.DTO
{
    public class FavoriteDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }

        public int? ObjectId { get; set; }
        public string? ObjectName { get; set; }

        public int? ActivityId { get; set; }
        public string? ActivityName { get; set; }

        public int? DestinationId { get; set; }
        public string? DestinationName { get; set; }

        public int? RouteId { get; set; }
        public string? RouteName { get; set; }

        public int? LocalityId { get; set; }
        public string? LocalityName { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}