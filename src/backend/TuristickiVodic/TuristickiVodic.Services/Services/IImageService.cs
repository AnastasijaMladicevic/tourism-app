using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IImageService
    {
        Task<ImageDto?> GetByIdAsync(int id);

        Task<ImageDto?> UpdateAsync(int id, UpdateImageDto dto, int userId, string roleName);

        Task<bool> DeleteAsync(int id, int userId, string roleName);

        Task<ImageDto> SetMainImageAsync(int id, int userId, string roleName);

        Task<IEnumerable<ImageDto>> GetForDestinationAsync(int destinationId);
        Task<ImageDto?> GetMainForDestinationAsync(int destinationId);
        Task<ImageDto> AddToDestinationAsync(int destinationId, AddImageDto dto, int userId, string roleName);

        Task<IEnumerable<ImageDto>> GetForLocalityAsync(int localityId);
        Task<ImageDto?> GetMainForLocalityAsync(int localityId);
        Task<ImageDto> AddToLocalityAsync(int localityId, AddImageDto dto, int userId, string roleName);

        Task<IEnumerable<ImageDto>> GetForObjectAsync(int objectId);
        Task<ImageDto?> GetMainForObjectAsync(int objectId);
        Task<ImageDto> AddToObjectAsync(int objectId, AddImageDto dto, int userId, string roleName);

        Task<IEnumerable<ImageDto>> GetForActivityAsync(int activityId);
        Task<ImageDto?> GetMainForActivityAsync(int activityId);
        Task<ImageDto> AddToActivityAsync(int activityId, AddImageDto dto, int userId, string roleName);

        Task<IEnumerable<ImageDto>> GetForEventAsync(int eventId);
        Task<ImageDto?> GetMainForEventAsync(int eventId);
        Task<ImageDto> AddToEventAsync(int eventId, AddImageDto dto, int userId, string roleName);
    }
}
