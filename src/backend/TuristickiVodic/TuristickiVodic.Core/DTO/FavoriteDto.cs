using System.ComponentModel.DataAnnotations;

namespace TuristickiVodic.Core.DTO
{
    public class FavoriteDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int? ObjectId { get; set; }
        public string? ObjectName { get; set; }
        public int? DestinationId { get; set; }
        public string? DestinationName { get; set; }
        public int? RouteId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateFavoriteDto
    {
        public int? ObjectId { get; set; }
        public int? DestinationId { get; set; }
        public int? RouteId { get; set; }
    }
}
