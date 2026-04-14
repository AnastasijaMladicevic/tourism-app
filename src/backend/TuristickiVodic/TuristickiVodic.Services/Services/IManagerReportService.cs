using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public interface IManagerReportService
    {
        Task<ManagerReportDto> CreateAsync(CreateManagerReportDto dto, int managerUserId);
        Task<PagedResultDto<ManagerReportDto>> GetForManagerAsync(int managerUserId, ManagerReportQueryDto query);
        Task<PagedResultDto<ManagerReportDto>> GetAllAsync(ManagerReportQueryDto query);
        Task<ManagerReportDto?> GetByIdAsync(int id, int userId, string roleName);
        Task<ManagerReportDto?> ReviewAsync(int id, ReviewManagerReportDto dto, int adminUserId);
        Task<bool> WithdrawAsync(int id, int managerUserId);
    }
}
