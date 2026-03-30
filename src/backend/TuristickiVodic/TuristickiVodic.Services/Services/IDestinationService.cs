using TuristickiVodic.Core.DTOs;

namespace TuristickiVodic.Services
{
    public interface IDestinationService
    {
        Task<IEnumerable<DestinationDto>> GetAllAsync();
        Task<DestinationDto?> GetByIdAsync(int id);
        Task<DestinationDto> CreateAsync(CreateDestinationDto dto, int userId);
        Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationDto dto, int requestingUserId, string roleName);
        Task<bool> DeleteAsync(int id);
    }
}
