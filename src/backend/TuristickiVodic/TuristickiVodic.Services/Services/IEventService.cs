using System;
using System.Collections.Generic;
using System.Text;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IEventService
    {
        Task<IEnumerable<EventDto>> GetAllAsync();
        Task<EventDto?> GetByIdAsync(int id);
        Task<EventDto> CreateAsync(CreateEventDto dto, int userId);
        Task<EventDto?> UpdateAsync(int id, UpdateEventDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}
