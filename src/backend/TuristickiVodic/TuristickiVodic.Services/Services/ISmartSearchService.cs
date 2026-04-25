using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface ISmartSearchService
    {
        Task<List<SmartSearchResultDto>> SearchAsync(int? userId, SmartSearchQueryDto query);
    }
}
