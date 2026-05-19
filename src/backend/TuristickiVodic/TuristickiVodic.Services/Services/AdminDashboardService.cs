using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private const int MinPeriodDays = 7;
        private const int MaxPeriodDays = 365;
        private const int MaxMapPoints = 200;

        private readonly AppDbContext _context;

        private sealed class UserGrowthRow
        {
            public DateTime Day { get; set; }
            public RoleType Role { get; set; }
        }

        private sealed class CreatorRequestStatusSnapshot
        {
            public bool HasRequestedCreatorRole { get; set; }
            public CreatorRoleRequestStatus CreatorRoleRequestStatus { get; set; }
        }

        public AdminDashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AdminDashboardOverviewDto> GetOverviewAsync(int days)
        {
            var periodDays = Math.Clamp(days, MinPeriodDays, MaxPeriodDays);
            var asOfUtc = DateTime.UtcNow;
            var periodStartUtc = asOfUtc.Date.AddDays(-(periodDays - 1));

            var totalTouristsTask = _context.Users
                .AsNoTracking()
                .CountAsync(u => u.Role.Name == RoleType.Tourist);

            var newTouristsInPeriodTask = _context.Users
                .AsNoTracking()
                .CountAsync(u => u.Role.Name == RoleType.Tourist && u.CreatedAt >= periodStartUtc);

            var activeDestinationsTask = _context.Destinations
                .AsNoTracking()
                .CountAsync(d => d.IsActive);

            var newDestinationsInPeriodTask = _context.Destinations
                .AsNoTracking()
                .CountAsync(d => d.CreatedAt >= periodStartUtc);

            var pendingCreatorRequestsTask = _context.Users
                .AsNoTracking()
                .CountAsync(HasPendingCreatorRoleRequestExpression());

            var reportsBreakdownTask = _context.ManagerReports
                .AsNoTracking()
                .GroupBy(r => r.Status)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var roleDistributionTask = _context.Users
                .AsNoTracking()
                .GroupBy(u => u.Role.Name)
                .Select(g => new
                {
                    Role = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var accountHealthTask = _context.Users
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(g => new AdminDashboardAccountHealthDto
                {
                    Verified = g.Count(u => u.IsVerified),
                    Unverified = g.Count(u => !u.IsVerified),
                    Active = g.Count(u => u.IsActive),
                    Inactive = g.Count(u => !u.IsActive),
                    TemporarilyBanned = g.Count(u => u.IsBlacklisted && u.BanExpiresAtUtc != null),
                    PermanentlyBanned = g.Count(u => u.IsBlacklisted && u.BanExpiresAtUtc == null),
                    TotalBanned = g.Count(u => u.IsBlacklisted)
                })
                .FirstOrDefaultAsync();

            var destinationsByRegionTask = _context.Regions
                .AsNoTracking()
                .Select(r => new AdminDashboardDestinationByRegionDto
                {
                    RegionId = r.Id,
                    RegionName = r.Name,
                    RegionCode = r.Code,
                    TotalDestinations = r.Destinations.Count(),
                    ActiveDestinations = r.Destinations.Count(d => d.IsActive),
                    GeocodedDestinations = r.Destinations.Count(d => d.Geolocation != null)
                })
                .OrderByDescending(r => r.ActiveDestinations)
                .ThenBy(r => r.RegionName)
                .ToListAsync();

            var userGrowthRowsTask = _context.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= periodStartUtc)
                .Select(u => new UserGrowthRow
                {
                    Day = u.CreatedAt.Date,
                    Role = u.Role.Name
                })
                .ToListAsync();

            var creatorRequestStatusesTask = _context.Users
                .AsNoTracking()
                .Select(u => new CreatorRequestStatusSnapshot
                {
                    HasRequestedCreatorRole = u.HasRequestedCreatorRole,
                    CreatorRoleRequestStatus = u.CreatorRoleRequestStatus
                })
                .ToListAsync();

            var mapPointsTask = _context.Destinations
                .AsNoTracking()
                .Where(d => d.IsActive && d.Geolocation != null)
                .OrderBy(d => d.Name)
                .Select(d => new AdminDashboardMapPointDto
                {
                    DestinationId = d.Id,
                    DestinationName = d.Name,
                    RegionId = d.RegionId,
                    RegionName = d.Region.Name,
                    Latitude = d.Geolocation!.Y,
                    Longitude = d.Geolocation!.X
                })
                .Take(MaxMapPoints)
                .ToListAsync();

            var geospatialSummaryTask = _context.Destinations
                .AsNoTracking()
                .Where(d => d.IsActive && d.Geolocation != null)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    RegionsRepresented = g.Select(x => x.RegionId).Distinct().Count()
                })
                .FirstOrDefaultAsync();

            await Task.WhenAll(
                totalTouristsTask,
                newTouristsInPeriodTask,
                activeDestinationsTask,
                newDestinationsInPeriodTask,
                pendingCreatorRequestsTask,
                reportsBreakdownTask,
                roleDistributionTask,
                accountHealthTask,
                destinationsByRegionTask,
                userGrowthRowsTask,
                creatorRequestStatusesTask,
                mapPointsTask,
                geospatialSummaryTask
            );

            var reportsBreakdown = reportsBreakdownTask.Result.ToDictionary(x => x.Status, x => x.Count);
            var roleDistributionLookup = roleDistributionTask.Result.ToDictionary(x => x.Role, x => x.Count);
            var creatorRequestStatuses = creatorRequestStatusesTask.Result;

            var pendingRequests = creatorRequestStatuses.Count(IsPendingCreatorRoleRequestSnapshot);
            var approvedRequests = creatorRequestStatuses.Count(x => x.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Approved);
            var rejectedRequests = creatorRequestStatuses.Count(x => x.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Rejected);
            var noneRequests = creatorRequestStatuses.Count(x =>
                !IsPendingCreatorRoleRequestSnapshot(x) &&
                x.CreatorRoleRequestStatus != CreatorRoleRequestStatus.Approved &&
                x.CreatorRoleRequestStatus != CreatorRoleRequestStatus.Rejected);

            return new AdminDashboardOverviewDto
            {
                PeriodDays = periodDays,
                AsOfUtc = asOfUtc,
                Summary = new AdminDashboardSummaryDto
                {
                    TotalTourists = totalTouristsTask.Result,
                    NewTouristsInPeriod = newTouristsInPeriodTask.Result,
                    ActiveDestinations = activeDestinationsTask.Result,
                    NewDestinationsInPeriod = newDestinationsInPeriodTask.Result,
                    PendingCreatorRequests = pendingCreatorRequestsTask.Result,
                    OpenReports = reportsBreakdown.GetValueOrDefault(ContentStatus.Pending)
                },
                UserGrowth = BuildUserGrowth(periodStartUtc, periodDays, userGrowthRowsTask.Result),
                RoleDistribution = BuildRoleDistribution(roleDistributionLookup),
                DestinationsByRegion = destinationsByRegionTask.Result,
                CreatorRequests = new AdminDashboardCreatorRequestStatusDto
                {
                    Pending = pendingRequests,
                    Approved = approvedRequests,
                    Rejected = rejectedRequests,
                    None = noneRequests,
                    TotalSubmitted = pendingRequests + approvedRequests + rejectedRequests
                },
                Reports = new AdminDashboardReportsSummaryDto
                {
                    Pending = reportsBreakdown.GetValueOrDefault(ContentStatus.Pending),
                    Approved = reportsBreakdown.GetValueOrDefault(ContentStatus.Approved),
                    Rejected = reportsBreakdown.GetValueOrDefault(ContentStatus.Rejected),
                    Total = reportsBreakdown.Values.Sum()
                },
                AccountHealth = accountHealthTask.Result ?? new AdminDashboardAccountHealthDto(),
                GeospatialOverview = new AdminDashboardGeospatialOverviewDto
                {
                    TotalActiveDestinationsWithCoordinates = geospatialSummaryTask.Result?.Total ?? 0,
                    RegionsRepresented = geospatialSummaryTask.Result?.RegionsRepresented ?? 0,
                    DisplayedPoints = mapPointsTask.Result.Count,
                    Points = mapPointsTask.Result
                }
            };
        }

        private static List<AdminDashboardUserGrowthPointDto> BuildUserGrowth(
            DateTime periodStartUtc,
            int periodDays,
            List<UserGrowthRow> rows)
        {
            var grouped = rows
                .GroupBy(x => (x.Day, x.Role))
                .ToDictionary(g => g.Key, g => g.Count());

            var points = new List<AdminDashboardUserGrowthPointDto>(periodDays);

            for (var i = 0; i < periodDays; i++)
            {
                var day = periodStartUtc.Date.AddDays(i);

                points.Add(new AdminDashboardUserGrowthPointDto
                {
                    Date = day,
                    Tourists = grouped.GetValueOrDefault((day, RoleType.Tourist)),
                    ContentCreators = grouped.GetValueOrDefault((day, RoleType.ContentCreator)),
                    Managers = grouped.GetValueOrDefault((day, RoleType.Manager)),
                    Admins = grouped.GetValueOrDefault((day, RoleType.Admin))
                });
            }

            return points;
        }

        private static List<AdminDashboardRoleDistributionItemDto> BuildRoleDistribution(
            IReadOnlyDictionary<RoleType, int> roleDistributionLookup)
        {
            return new List<AdminDashboardRoleDistributionItemDto>
            {
                new() { Role = RoleType.Tourist.ToString(), Count = roleDistributionLookup.GetValueOrDefault(RoleType.Tourist) },
                new() { Role = RoleType.ContentCreator.ToString(), Count = roleDistributionLookup.GetValueOrDefault(RoleType.ContentCreator) },
                new() { Role = RoleType.Manager.ToString(), Count = roleDistributionLookup.GetValueOrDefault(RoleType.Manager) },
                new() { Role = RoleType.Admin.ToString(), Count = roleDistributionLookup.GetValueOrDefault(RoleType.Admin) }
            };
        }

        private static System.Linq.Expressions.Expression<Func<User, bool>> HasPendingCreatorRoleRequestExpression()
            => u => u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Pending ||
                    (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.None && u.HasRequestedCreatorRole);

        private static bool IsPendingCreatorRoleRequestSnapshot(CreatorRequestStatusSnapshot snapshot)
            => snapshot.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Pending ||
               (snapshot.CreatorRoleRequestStatus == CreatorRoleRequestStatus.None && snapshot.HasRequestedCreatorRole);
    }
}
