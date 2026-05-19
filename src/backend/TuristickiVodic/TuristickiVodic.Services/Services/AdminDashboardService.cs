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
        private const int DefaultPeriodDays = 30;
        private const int MinPeriodDays = 7;
        private const int MaxPeriodDays = 1825;
        private const int MaxMapPoints = 200;

        private readonly AppDbContext _context;

        private sealed class DashboardPeriod
        {
            public string Key { get; init; } = "30d";
            public DateTime StartUtc { get; init; }
            public int Days { get; init; }
            public string Granularity { get; init; } = "day";
        }

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

        public async Task<AdminDashboardOverviewDto> GetOverviewAsync(string? period = null, int? days = null)
        {
            var asOfUtc = DateTime.UtcNow;
            var dashboardPeriod = ResolveDashboardPeriod(asOfUtc, period, days);
            var periodDays = dashboardPeriod.Days;
            var periodStartUtc = dashboardPeriod.StartUtc;

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
                .Where(u =>
                    u.CreatedAt >= periodStartUtc ||
                    u.UpdatedAt >= periodStartUtc ||
                    (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Pending) ||
                    (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.None && u.HasRequestedCreatorRole))
                .CountAsync(HasPendingCreatorRoleRequestExpression());

            var reportsBreakdownTask = _context.ManagerReports
                .AsNoTracking()
                .Where(r => r.CreatedAt >= periodStartUtc)
                .GroupBy(r => r.Status)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var roleDistributionTask = _context.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= periodStartUtc)
                .GroupBy(u => u.Role.Name)
                .Select(g => new
                {
                    Role = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var accountHealthTask = _context.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= periodStartUtc)
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
                    TotalDestinations = r.Destinations.Count(d => d.CreatedAt >= periodStartUtc),
                    ActiveDestinations = r.Destinations.Count(d => d.CreatedAt >= periodStartUtc && d.IsActive),
                    GeocodedDestinations = r.Destinations.Count(d => d.CreatedAt >= periodStartUtc && d.Geolocation != null)
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
                .Where(u =>
                    u.CreatedAt >= periodStartUtc ||
                    u.UpdatedAt >= periodStartUtc ||
                    (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.Pending) ||
                    (u.CreatorRoleRequestStatus == CreatorRoleRequestStatus.None && u.HasRequestedCreatorRole))
                .Select(u => new CreatorRequestStatusSnapshot
                {
                    HasRequestedCreatorRole = u.HasRequestedCreatorRole,
                    CreatorRoleRequestStatus = u.CreatorRoleRequestStatus
                })
                .ToListAsync();

            var mapPointsTask = _context.Destinations
                .AsNoTracking()
                .Where(d => d.CreatedAt >= periodStartUtc && d.IsActive && d.Geolocation != null)
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
                .Where(d => d.CreatedAt >= periodStartUtc && d.IsActive && d.Geolocation != null)
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
                PeriodKey = dashboardPeriod.Key,
                PeriodDays = periodDays,
                UserGrowthGranularity = dashboardPeriod.Granularity,
                AsOfUtc = asOfUtc,
                PeriodStartUtc = periodStartUtc,
                Summary = new AdminDashboardSummaryDto
                {
                    TotalTourists = totalTouristsTask.Result,
                    NewTouristsInPeriod = newTouristsInPeriodTask.Result,
                    ActiveDestinations = activeDestinationsTask.Result,
                    NewDestinationsInPeriod = newDestinationsInPeriodTask.Result,
                    PendingCreatorRequests = pendingCreatorRequestsTask.Result,
                    OpenReports = reportsBreakdown.GetValueOrDefault(ContentStatus.Pending)
                },
                UserGrowth = BuildUserGrowth(periodStartUtc, asOfUtc, dashboardPeriod.Granularity, userGrowthRowsTask.Result),
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

        private static DashboardPeriod ResolveDashboardPeriod(DateTime asOfUtc, string? period, int? days)
        {
            var normalizedPeriod = period?.Trim().ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedPeriod))
            {
                return normalizedPeriod switch
                {
                    "7d" => CreateDashboardPeriod("7d", asOfUtc.Date.AddDays(-6), asOfUtc, "day"),
                    "30d" => CreateDashboardPeriod("30d", asOfUtc.Date.AddDays(-29), asOfUtc, "day"),
                    "3m" => CreateDashboardPeriod("3m", asOfUtc.Date.AddMonths(-3).AddDays(1), asOfUtc, "week"),
                    "6m" => CreateDashboardPeriod("6m", asOfUtc.Date.AddMonths(-6).AddDays(1), asOfUtc, "week"),
                    "1y" => CreateDashboardPeriod("1y", asOfUtc.Date.AddYears(-1).AddDays(1), asOfUtc, "month"),
                    "5y" => CreateDashboardPeriod("5y", asOfUtc.Date.AddYears(-5).AddDays(1), asOfUtc, "month"),
                    _ => CreateDashboardPeriod("30d", asOfUtc.Date.AddDays(-(Math.Clamp(days ?? DefaultPeriodDays, MinPeriodDays, MaxPeriodDays) - 1)), asOfUtc, ResolveGranularity(days ?? DefaultPeriodDays))
                };
            }

            var fallbackDays = Math.Clamp(days ?? DefaultPeriodDays, MinPeriodDays, MaxPeriodDays);
            return CreateDashboardPeriod($"{fallbackDays}d", asOfUtc.Date.AddDays(-(fallbackDays - 1)), asOfUtc, ResolveGranularity(fallbackDays));
        }

        private static DashboardPeriod CreateDashboardPeriod(string key, DateTime startUtc, DateTime asOfUtc, string granularity)
        {
            var normalizedStart = startUtc.Date;
            return new DashboardPeriod
            {
                Key = key,
                StartUtc = normalizedStart,
                Days = Math.Max(1, (asOfUtc.Date - normalizedStart).Days + 1),
                Granularity = granularity
            };
        }

        private static string ResolveGranularity(int days)
            => days switch
            {
                <= 31 => "day",
                <= 180 => "week",
                _ => "month"
            };

        private static List<AdminDashboardUserGrowthPointDto> BuildUserGrowth(
            DateTime periodStartUtc,
            DateTime asOfUtc,
            string granularity,
            List<UserGrowthRow> rows)
        {
            var normalizedEndDate = asOfUtc.Date;
            var buckets = BuildBuckets(periodStartUtc.Date, normalizedEndDate, granularity);

            var grouped = rows
                .GroupBy(x => (BucketStart: GetBucketStart(x.Day.Date, periodStartUtc.Date, granularity), x.Role))
                .ToDictionary(g => g.Key, g => g.Count());

            return buckets
                .Select(bucketStart => new AdminDashboardUserGrowthPointDto
                {
                    Date = bucketStart,
                    Tourists = grouped.GetValueOrDefault((bucketStart, RoleType.Tourist)),
                    ContentCreators = grouped.GetValueOrDefault((bucketStart, RoleType.ContentCreator)),
                    Managers = grouped.GetValueOrDefault((bucketStart, RoleType.Manager)),
                    Admins = grouped.GetValueOrDefault((bucketStart, RoleType.Admin))
                })
                .ToList();
        }

        private static List<DateTime> BuildBuckets(DateTime periodStartUtc, DateTime periodEndUtc, string granularity)
        {
            var buckets = new List<DateTime>();

            switch (granularity)
            {
                case "month":
                {
                    var cursor = new DateTime(periodStartUtc.Year, periodStartUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    var end = new DateTime(periodEndUtc.Year, periodEndUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);

                    while (cursor <= end)
                    {
                        buckets.Add(cursor);
                        cursor = cursor.AddMonths(1);
                    }

                    break;
                }
                case "week":
                {
                    var cursor = periodStartUtc;
                    while (cursor <= periodEndUtc)
                    {
                        buckets.Add(cursor);
                        cursor = cursor.AddDays(7);
                    }

                    break;
                }
                default:
                {
                    var cursor = periodStartUtc;
                    while (cursor <= periodEndUtc)
                    {
                        buckets.Add(cursor);
                        cursor = cursor.AddDays(1);
                    }

                    break;
                }
            }

            return buckets;
        }

        private static DateTime GetBucketStart(DateTime date, DateTime periodStartUtc, string granularity)
        {
            return granularity switch
            {
                "month" => new DateTime(date.Year, date.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                "week" => periodStartUtc.AddDays(((date - periodStartUtc).Days / 7) * 7),
                _ => date
            };
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
