using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IEventPlannerService
    {
        Task<IEnumerable<EventPlannerDto>> GetMyPlannerAsync(int userId);
        Task<EventPlannerDto> AddAsync(CreateEventPlannerDto dto, int userId);
        Task<bool> RemoveAsync(int id, int userId);
    }
}
