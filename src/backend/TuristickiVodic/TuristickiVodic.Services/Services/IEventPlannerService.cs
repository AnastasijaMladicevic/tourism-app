using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IEventPlannerService
    {
        Task<PagedResultDto<EventPlannerDto>> GetMyPlannerAsync(int userId, EventPlannerQueryDto query);
        Task<EventPlannerDto> AddAsync(CreateEventPlannerDto dto, int userId);
        Task<bool> RemoveAsync(int id, int userId);
    }
}
