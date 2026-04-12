using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services
{
    public interface IDestinationService
    {
        Task<PagedResultDto<DestinationDto>> GetAllAsync(int? userId, string? role, DestinationQueryDto query);
        Task<DestinationDto?> GetByIdAsync(int id, int? userId, string role);
        Task<DestinationDto> CreateAsync(CreateDestinationDto dto, int userId);
        Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationDto dto, int requestingUserId, string roleName);
        Task<DestinationDto?> AssignManagerAsync(int destinationId, int newManagerUserId);
        Task<bool> DeleteAsync(int id);
    }
}
