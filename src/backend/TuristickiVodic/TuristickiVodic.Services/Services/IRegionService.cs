using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IRegionService
    {
        Task<IReadOnlyList<RegionDto>> GetAllAsync(bool includeInactive = false);
        Task<RegionDto?> GetByIdAsync(int id);
        Task<RegionDto?> GetDefaultAsync();
    }
}
