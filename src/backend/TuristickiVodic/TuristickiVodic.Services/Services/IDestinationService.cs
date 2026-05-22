using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services
{
    public interface IDestinationService
    {
        Task<PagedResultDto<DestinationDto>> GetAllAsync(int? userId, string? role, DestinationQueryDto query);
        Task<DestinationDto?> GetByIdAsync(int id, int? userId, string? role, string lang = "sr");
        Task<DestinationDto> CreateAsync(CreateDestinationDto dto, int userId);
        Task<DestinationEditLockDto?> AcquireEditLockAsync(int destinationId, int requestingUserId);
        Task<DestinationEditLockDto?> RefreshEditLockAsync(int destinationId, int requestingUserId);
        Task<bool> ReleaseEditLockAsync(int destinationId, int requestingUserId);
        Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationDto dto, int requestingUserId, string roleName);
        Task<DestinationDto?> AssignManagerAsync(int destinationId, int newManagerUserId, int requestingUserId);
        Task<bool> DeleteAsync(int id);
    }
}
