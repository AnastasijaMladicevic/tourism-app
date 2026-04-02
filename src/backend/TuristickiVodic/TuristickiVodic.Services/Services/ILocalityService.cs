using System;
using System.Collections.Generic;
using System.Text;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface ILocalityService
    {
        Task<IEnumerable<LocalityDto>> GetAllAsync();
        Task<LocalityDto?> GetByIdAsync(int id);
        Task<LocalityDto> CreateAsync(CreateLocalityDto dto, int userId, string roleName);
        Task<LocalityDto?> UpdateAsync(int id, UpdateLocalityDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}
