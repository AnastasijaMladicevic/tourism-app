using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IEventService
    {
        Task<EventDto?> GetByIdAsync(int id);
        Task<EventDto> CreateAsync(CreateEventDto dto, int userId, string roleName);
        Task<EventDto?> UpdateAsync(int id, UpdateEventDto dto, int userId, string roleName);
        Task<EventDto?> ApproveAsync(int id, ApproveContentDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
        Task<EventDto?> ToggleActiveAsync(int id, bool isActive, int userId, string roleName);
        Task<PagedResultDto<EventDto>> GetAllAsync(EventQueryDto query);
        Task<PagedResultDto<EventDto>> SearchAsync(EventQueryDto query);
    }
}
