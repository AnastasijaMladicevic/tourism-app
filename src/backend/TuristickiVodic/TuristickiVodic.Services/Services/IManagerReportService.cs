using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IManagerReportService
    {
        Task<ManagerReportDto> CreateAsync(CreateManagerReportDto dto, int managerUserId);
        Task<IEnumerable<ManagerReportDto>> GetForManagerAsync(int managerUserId);
        Task<IEnumerable<ManagerReportDto>> GetAllAsync();
        Task<ManagerReportDto?> GetByIdAsync(int id, int userId, string roleName);
        Task<ManagerReportDto?> ReviewAsync(int id, ReviewManagerReportDto dto, int adminUserId);
        Task<bool> WithdrawAsync(int id, int managerUserId);
    }
}
