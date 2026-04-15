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
                .Include(o => o.Locality)
                .AnyAsync(o => o.CreatedByUserId == dto.ReportedUserId &&
                    ((o.Locality != null && o.Locality.DestinationId == destinationId) ||
                     o.DestinationId == destinationId));

            var hasEventInDestination = await _context.Events
                .Include(e => e.Locality)
                .Include(e => e.Object)
                    .ThenInclude(o => o.Locality)
                .AnyAsync(e => e.CreatedByUserId == dto.ReportedUserId &&
                    ((e.DestinationId == destinationId) ||
                     (e.Locality != null && e.Locality.DestinationId == destinationId) ||
                     (e.Object != null && ((e.Object.Locality != null && e.Object.Locality.DestinationId == destinationId) ||
                                           e.Object.DestinationId == destinationId))));

            var hasActivityInDestination = await _context.Activities
                .Include(a => a.Locality)
                .AnyAsync(a => a.CreatedByUserId == dto.ReportedUserId &&
                    ((a.DestinationId == destinationId) ||
                     (a.Locality != null && a.Locality.DestinationId == destinationId)));

            if (!hasObjectInDestination && !hasEventInDestination && !hasActivityInDestination)
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

        public async Task<PagedResultDto<ManagerReportDto>> GetForManagerAsync(int managerUserId, ManagerReportQueryDto query)
        {
            NormalizeQuery(query);

            var reportsQuery = BuildReportsQuery()
                .Where(r => r.ManagerId == managerUserId);

            reportsQuery = ApplyFilters(reportsQuery, query);
            reportsQuery = ApplySorting(reportsQuery, query.SortBy, query.SortOrder);

            var totalCount = await reportsQuery.CountAsync();

            var reports = await reportsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<ManagerReportDto>
            {
                Items = reports.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<PagedResultDto<ManagerReportDto>> GetAllAsync(ManagerReportQueryDto query)
        {
            NormalizeQuery(query);

            var reportsQuery = BuildReportsQuery();

            reportsQuery = ApplyFilters(reportsQuery, query);
            reportsQuery = ApplySorting(reportsQuery, query.SortBy, query.SortOrder);

            var totalCount = await reportsQuery.CountAsync();

            var reports = await reportsQuery
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResultDto<ManagerReportDto>
            {
                Items = reports.Select(MapToDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize)
            };
        }

        public async Task<ManagerReportDto?> GetByIdAsync(int id, int userId, string roleName)
        {
            var report = await BuildReportsQuery()
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
                    .ThenInclude(m => m.ManagedDestination)
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

                var refreshToken = await _context.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.UserId == report.ReportedUser.Id);

                if (refreshToken != null)
                {
                    _context.RefreshTokens.Remove(refreshToken);
                }
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
            var report = await BuildReportsQuery()
                .FirstAsync(r => r.Id == id);

            return MapToDto(report);
        }

        private IQueryable<ManagerReport> BuildReportsQuery()
        {
            return _context.ManagerReports
                .Include(r => r.Manager)
                    .ThenInclude(m => m.ManagedDestination)
                .Include(r => r.ReportedUser)
                .Include(r => r.ResolvedBy)
                .AsQueryable();
        }

        private static void NormalizeQuery(ManagerReportQueryDto query)
        {
            if (query.Page < 1)
                query.Page = 1;

            if (query.PageSize < 1)
                query.PageSize = 10;

            if (query.PageSize > 100)
                query.PageSize = 100;
        }

        private static IQueryable<ManagerReport> ApplyFilters(IQueryable<ManagerReport> reportsQuery, ManagerReportQueryDto query)
        {
            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim().ToLower();

                reportsQuery = reportsQuery.Where(r =>
                    r.Reason.ToLower().Contains(search) ||
                    (r.RejectionReason != null && r.RejectionReason.ToLower().Contains(search)) ||
                    (r.Manager != null && (
                        r.Manager.FirstName.ToLower().Contains(search) ||
                        r.Manager.LastName.ToLower().Contains(search) ||
                        (r.Manager.FirstName + " " + r.Manager.LastName).ToLower().Contains(search))) ||
                    (r.ReportedUser != null && (
                        r.ReportedUser.FirstName.ToLower().Contains(search) ||
                        r.ReportedUser.LastName.ToLower().Contains(search) ||
                        (r.ReportedUser.FirstName + " " + r.ReportedUser.LastName).ToLower().Contains(search))) ||
                    (r.ResolvedBy != null && (
                        r.ResolvedBy.FirstName.ToLower().Contains(search) ||
                        r.ResolvedBy.LastName.ToLower().Contains(search) ||
                        (r.ResolvedBy.FirstName + " " + r.ResolvedBy.LastName).ToLower().Contains(search))) ||
                    (r.Manager != null &&
                     r.Manager.ManagedDestination != null &&
                     r.Manager.ManagedDestination.Name.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(query.Manager))
            {
                var manager = query.Manager.Trim().ToLower();

                reportsQuery = reportsQuery.Where(r =>
                    r.Manager != null && (
                        r.Manager.FirstName.ToLower().Contains(manager) ||
                        r.Manager.LastName.ToLower().Contains(manager) ||
                        (r.Manager.FirstName + " " + r.Manager.LastName).ToLower().Contains(manager)));
            }

            if (!string.IsNullOrWhiteSpace(query.ReportedUser))
            {
                var reportedUser = query.ReportedUser.Trim().ToLower();

                reportsQuery = reportsQuery.Where(r =>
                    r.ReportedUser != null && (
                        r.ReportedUser.FirstName.ToLower().Contains(reportedUser) ||
                        r.ReportedUser.LastName.ToLower().Contains(reportedUser) ||
                        (r.ReportedUser.FirstName + " " + r.ReportedUser.LastName).ToLower().Contains(reportedUser)));
            }

            if (!string.IsNullOrWhiteSpace(query.Destination))
            {
                var destination = query.Destination.Trim().ToLower();

                reportsQuery = reportsQuery.Where(r =>
                    r.Manager != null &&
                    r.Manager.ManagedDestination != null &&
                    r.Manager.ManagedDestination.Name.ToLower().Contains(destination));
            }

            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                var statusFilter = query.Status.Trim();

                if (Enum.TryParse<ContentStatus>(statusFilter, true, out var parsedStatus))
                {
                    reportsQuery = reportsQuery.Where(r => r.Status == parsedStatus);
                }
                else
                {
                    reportsQuery = reportsQuery.Where(_ => false);
                }
            }

            return reportsQuery;
        }

        private static IQueryable<ManagerReport> ApplySorting(IQueryable<ManagerReport> query, string? sortBy, string? sortOrder)
        {
            var sortByValue = sortBy?.Trim().ToLower();
            var isDesc = sortOrder?.Trim().ToLower() == "desc";

            if (sortByValue == "manager")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Manager != null ? r.Manager.FirstName : string.Empty)
                        .ThenByDescending(r => r.Manager != null ? r.Manager.LastName : string.Empty)
                    : query.OrderBy(r => r.Manager != null ? r.Manager.FirstName : string.Empty)
                        .ThenBy(r => r.Manager != null ? r.Manager.LastName : string.Empty);
            }

            if (sortByValue == "reporteduser" || sortByValue == "user")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.ReportedUser != null ? r.ReportedUser.FirstName : string.Empty)
                        .ThenByDescending(r => r.ReportedUser != null ? r.ReportedUser.LastName : string.Empty)
                    : query.OrderBy(r => r.ReportedUser != null ? r.ReportedUser.FirstName : string.Empty)
                        .ThenBy(r => r.ReportedUser != null ? r.ReportedUser.LastName : string.Empty);
            }

            if (sortByValue == "destination")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.Manager != null && r.Manager.ManagedDestination != null
                        ? r.Manager.ManagedDestination.Name
                        : string.Empty)
                    : query.OrderBy(r => r.Manager != null && r.Manager.ManagedDestination != null
                        ? r.Manager.ManagedDestination.Name
                        : string.Empty);
            }

            if (sortByValue == "resolvedat")
            {
                return isDesc
                    ? query.OrderByDescending(r => r.ResolvedAt)
                    : query.OrderBy(r => r.ResolvedAt);
            }

            if (sortByValue == "status")
            {
                var statusSortQuery = query.Select(r => new
                {
                    Report = r,
                    StatusSortOrder = r.Status == ContentStatus.Pending
                        ? 1
                        : r.Status == ContentStatus.Approved
                            ? 2
                            : 3
                });

                return isDesc
                    ? statusSortQuery.OrderByDescending(x => x.StatusSortOrder).Select(x => x.Report)
                    : statusSortQuery.OrderBy(x => x.StatusSortOrder).Select(x => x.Report);
            }

            return isDesc
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt);
        }

        private static ManagerReportDto MapToDto(ManagerReport report)
        {
            return new ManagerReportDto
            {
                Id = report.Id,
                ManagerId = report.ManagerId,
                ManagerName = report.Manager != null ? $"{report.Manager.FirstName} {report.Manager.LastName}" : string.Empty,
                DestinationName = report.Manager?.ManagedDestination?.Name ?? string.Empty,
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
