using System.Threading.Tasks;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IAdminDashboardService
    {
        Task<AdminDashboardOverviewDto> GetOverviewAsync(string? period = null, int? days = null);
    }
}
