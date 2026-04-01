using System;
using System.Collections.Generic;
using System.Text;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IImageService
    {
        Task<IEnumerable<ImageDto>> GetAllAsync();
        Task<ImageDto?> GetByIdAsync(int id);
        Task<ImageDto> CreateAsync(CreateImageDto dto);
        Task<ImageDto?> UpdateAsync(int id, UpdateImageDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
