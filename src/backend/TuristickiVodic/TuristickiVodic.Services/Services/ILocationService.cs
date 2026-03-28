using System;
using System.Collections.Generic;
using System.Text;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface ILocationService
    {
        Task<IEnumerable<LocationDto>> GetAllAsync();
        Task<LocationDto?> GetByIdAsync(int id);
        Task<LocationDto> CreateAsync(CreateLocationDto dto, int userId, string roleName);
        Task<LocationDto?> UpdateAsync(int id, UpdateLocationDto dto, int userId, string roleName);
        Task<bool> DeleteAsync(int id, int userId, string roleName);
    }
}
