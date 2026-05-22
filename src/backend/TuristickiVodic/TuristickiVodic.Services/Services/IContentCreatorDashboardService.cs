using System.Threading.Tasks;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IContentCreatorDashboardService
    {
        Task<ContentCreatorDashboardOverviewDto> GetOverviewAsync(int creatorId, string? period = null, int? days = null);
    }
}
