using Microsoft.EntityFrameworkCore;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class ManagerReportService : IManagerReportService
    {
        private readonly AppDbContext _context;

        public ManagerReportService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ManagerReportDto> CreateAsync(CreateManagerReportDto dto, int managerUserId)
        {
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new InvalidOperationException("Reason is required.");

            var manager = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.ManagedDestination)
                .FirstOrDefaultAsync(u => u.Id == managerUserId);

            if (manager == null)
                throw new InvalidOperationException("Manager not found.");

            if (manager.Role.Name != RoleType.Manager)
                throw new UnauthorizedAccessException("Only managers can create reports.");

            if (manager.ManagedDestinationId == null)
                throw new InvalidOperationException("Manager does not manage any destination.");

            if (dto.ReportedUserId == managerUserId)
                throw new InvalidOperationException("Manager cannot report themselves.");

            var reportedUser = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == dto.ReportedUserId);

            if (reportedUser == null)
                throw new InvalidOperationException("Reported user not found.");

            if (reportedUser.Role.Name != RoleType.ContentCreator)
                throw new InvalidOperationException("Only content creators can be reported.");

            if (reportedUser.IsBlacklisted)
                throw new InvalidOperationException("This content creator is already blacklisted.");

            var destinationId = manager.ManagedDestinationId.Value;

            var hasObjectInDestination = await _context.Objects
                .Include(o => o.Location)
                .AnyAsync(o => o.CreatedByUserId == dto.ReportedUserId &&
                    ((o.Location != null && o.Location.DestinationId == destinationId) ||
                     o.DestinationId == destinationId));

            var hasEventInDestination = await _context.Events
                .Include(e => e.Location)
                .Include(e => e.Object)
                    .ThenInclude(o => o.Location)
                .AnyAsync(e => e.CreatedByUserId == dto.ReportedUserId &&
                    ((e.DestinationId == destinationId) ||
                     (e.Location != null && e.Location.DestinationId == destinationId) ||
                     (e.Object != null && ((e.Object.Location != null && e.Object.Location.DestinationId == destinationId) ||
                                           e.Object.DestinationId == destinationId))));

            if (!hasObjectInDestination && !hasEventInDestination)
                throw new InvalidOperationException("The content creator must have content in your destination.");

            var existingPending = await _context.ManagerReports
                .AnyAsync(r => r.ReportedUserId == dto.ReportedUserId && r.Status == ContentStatus.Pending);

            if (existingPending)
                throw new InvalidOperationException("A pending report for this content creator already exists.");

            var report = new ManagerReport
            {
                ManagerId = managerUserId,
                ReportedUserId = dto.ReportedUserId,
                Reason = dto.Reason.Trim(),
                Status = ContentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.ManagerReports.Add(report);
            await _context.SaveChangesAsync();

            return await LoadDtoAsync(report.Id);
        }

        public async Task<IEnumerable<ManagerReportDto>> GetForManagerAsync(int managerUserId)
        {
            var reports = await _context.ManagerReports
                .Include(r => r.Manager)
                .Include(r => r.ReportedUser)
                .Include(r => r.ResolvedBy)
                .Where(r => r.ManagerId == managerUserId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return reports.Select(MapToDto);
        }

        public async Task<IEnumerable<ManagerReportDto>> GetAllAsync()
        {
            var reports = await _context.ManagerReports
                .Include(r => r.Manager)
                .Include(r => r.ReportedUser)
                .Include(r => r.ResolvedBy)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return reports.Select(MapToDto);
        }

        public async Task<ManagerReportDto?> GetByIdAsync(int id, int userId, string roleName)
        {
            var report = await _context.ManagerReports
                .Include(r => r.Manager)
                .Include(r => r.ReportedUser)
                .Include(r => r.ResolvedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null)
                return null;

            if (roleName == "Manager")
            {
                if (report.ManagerId != userId)
                    throw new UnauthorizedAccessException("Manager can only view their own reports.");
            }
            else if (roleName != "Admin")
            {
                throw new UnauthorizedAccessException("Only managers and admins can view reports.");
            }

            return MapToDto(report);
        }

        public async Task<ManagerReportDto?> ReviewAsync(int id, ReviewManagerReportDto dto, int adminUserId)
        {
            var report = await _context.ManagerReports
                .Include(r => r.Manager)
                .Include(r => r.ReportedUser)
                    .ThenInclude(u => u.Role)
                .Include(r => r.ResolvedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null)
                return null;

            if (report.Status != ContentStatus.Pending)
                throw new InvalidOperationException("This report has already been resolved.");

            if (!dto.Approve && string.IsNullOrWhiteSpace(dto.RejectionReason))
                throw new InvalidOperationException("Rejection reason is required when rejecting a report.");

            report.Status = dto.Approve ? ContentStatus.Approved : ContentStatus.Rejected;
            report.ResolvedByUserId = adminUserId;
            report.ResolvedAt = DateTime.UtcNow;
            report.RejectionReason = dto.Approve ? null : dto.RejectionReason?.Trim();

            if (dto.Approve)
            {
                var touristRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == RoleType.Tourist);
                if (touristRole == null)
                    throw new InvalidOperationException("Tourist role not found.");

                report.ReportedUser.RoleId = touristRole.Id;
                report.ReportedUser.Role = touristRole;
                report.ReportedUser.IsBlacklisted = true;
                report.ReportedUser.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return MapToDto(report);
        }

        public async Task<bool> WithdrawAsync(int id, int managerUserId)
        {
            var report = await _context.ManagerReports.FirstOrDefaultAsync(r => r.Id == id);

            if (report == null)
                return false;

            if (report.ManagerId != managerUserId)
                throw new UnauthorizedAccessException("Manager can withdraw only their own reports.");

            if (report.Status != ContentStatus.Pending)
                throw new InvalidOperationException("Only pending reports can be withdrawn.");

            _context.ManagerReports.Remove(report);
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<ManagerReportDto> LoadDtoAsync(int id)
        {
            var report = await _context.ManagerReports
                .Include(r => r.Manager)
                .Include(r => r.ReportedUser)
                .Include(r => r.ResolvedBy)
                .FirstAsync(r => r.Id == id);

            return MapToDto(report);
        }

        private static ManagerReportDto MapToDto(ManagerReport report)
        {
            return new ManagerReportDto
            {
                Id = report.Id,
                ManagerId = report.ManagerId,
                ManagerName = report.Manager != null ? $"{report.Manager.FirstName} {report.Manager.LastName}" : string.Empty,
                ReportedUserId = report.ReportedUserId,
                ReportedUserName = report.ReportedUser != null ? $"{report.ReportedUser.FirstName} {report.ReportedUser.LastName}" : string.Empty,
                Reason = report.Reason,
                Status = report.Status.ToString(),
                ResolvedByUserId = report.ResolvedByUserId,
                ResolvedByName = report.ResolvedBy != null ? $"{report.ResolvedBy.FirstName} {report.ResolvedBy.LastName}" : null,
                RejectionReason = report.RejectionReason,
                CreatedAt = report.CreatedAt,
                ResolvedAt = report.ResolvedAt
            };
        }
    }
}
