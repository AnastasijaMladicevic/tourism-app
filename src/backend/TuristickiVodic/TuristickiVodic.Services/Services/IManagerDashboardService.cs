using System.Threading.Tasks;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IManagerDashboardService
    {
        Task<ManagerDashboardOverviewDto> GetOverviewAsync(int managerId, string? period = null, int? days = null);
    }
}
