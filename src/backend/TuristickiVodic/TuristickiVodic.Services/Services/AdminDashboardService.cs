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
        private const int MaxTopEngagedDestinations = 6;
        private const int MaxTopEngagedRegions = 6;

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

        private sealed class DashboardDestinationFavoriteRow
        {
            public int DestinationId { get; set; }
            public string DestinationName { get; set; } = string.Empty;
            public int RegionId { get; set; }
            public string RegionName { get; set; } = string.Empty;
            public string RegionCode { get; set; } = string.Empty;
            public int UserId { get; set; }
        }

        private sealed class DashboardDestinationPlannerRow
        {
            public int DestinationId { get; set; }
            public string DestinationName { get; set; } = string.Empty;
            public int RegionId { get; set; }
            public string RegionName { get; set; } = string.Empty;
            public string RegionCode { get; set; } = string.Empty;
            public int UserId { get; set; }
        }

        private sealed class DashboardDestinationReviewRow
        {
            public int DestinationId { get; set; }
            public string DestinationName { get; set; } = string.Empty;
            public int RegionId { get; set; }
            public string RegionName { get; set; } = string.Empty;
            public string RegionCode { get; set; } = string.Empty;
            public int Rating { get; set; }
        }

        private sealed class DashboardBannedUserRow
        {
            public int TemporarilyBanned { get; set; }
            public int PermanentlyBanned { get; set; }
            public int? PreferredRegionId { get; set; }
            public string? PreferredRegionName { get; set; }
            public string? PreferredRegionCode { get; set; }
            public int? ManagedRegionId { get; set; }
            public string? ManagedRegionName { get; set; }
            public string? ManagedRegionCode { get; set; }
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

            var totalTourists = await _context.Users
                .AsNoTracking()
                .CountAsync(u => u.Role.Name == RoleType.Tourist);

            var newTouristsInPeriod = await _context.Users
                .AsNoTracking()
                .CountAsync(u => u.Role.Name == RoleType.Tourist && u.CreatedAt >= periodStartUtc);

            var activeDestinations = await _context.Destinations
                .AsNoTracking()
                .CountAsync(d => d.IsActive);

            var newDestinationsInPeriod = await _context.Destinations
                .AsNoTracking()
                .CountAsync(d => d.CreatedAt >= periodStartUtc);

            var pendingCreatorRequests = await _context.Users
                .AsNoTracking()
                .CountAsync(HasPendingCreatorRoleRequestExpression());

            var openReports = await _context.ManagerReports
                .AsNoTracking()
                .CountAsync(r => r.Status == ContentStatus.Pending);

            var reportsBreakdownRows = await _context.ManagerReports
                .AsNoTracking()
                .Where(r => r.CreatedAt >= periodStartUtc)
                .GroupBy(r => r.Status)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var roleDistributionRows = await _context.Users
                .AsNoTracking()
                .GroupBy(u => u.Role.Name)
                .Select(g => new
                {
                    Role = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var bannedUsers = await _context.Users
                .AsNoTracking()
                .Where(u => u.IsBlacklisted)
                .Select(u => new DashboardBannedUserRow
                {
                    TemporarilyBanned = u.BanExpiresAtUtc != null ? 1 : 0,
                    PermanentlyBanned = u.BanExpiresAtUtc == null ? 1 : 0,
                    PreferredRegionId = u.PreferredRegionId,
                    PreferredRegionName = u.PreferredRegion != null ? u.PreferredRegion.Name : null,
                    PreferredRegionCode = u.PreferredRegion != null ? u.PreferredRegion.Code : null,
                    ManagedRegionId = u.ManagedDestination != null ? (int?)u.ManagedDestination.RegionId : null,
                    ManagedRegionName = u.ManagedDestination != null ? u.ManagedDestination.Region.Name : null,
                    ManagedRegionCode = u.ManagedDestination != null ? u.ManagedDestination.Region.Code : null
                })
                .ToListAsync();

            var destinationsByRegion = await _context.Regions
                .AsNoTracking()
                .Where(r => r.Code != "GR")
                .Select(r => new AdminDashboardDestinationByRegionDto
                {
                    RegionId = r.Id,
                    RegionName = r.Name,
                    RegionCode = r.Code,
                    TotalDestinations = r.Destinations.Count(),
                    ActiveDestinations = r.Destinations.Count(d => d.IsActive),
                    GeocodedDestinations = r.Destinations.Count(d => d.Geolocation != null)
                })
                .Where(r => r.TotalDestinations > 0)
                .OrderByDescending(r => r.ActiveDestinations)
                .ThenBy(r => r.RegionName)
                .ToListAsync();

            var userGrowthRows = await _context.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= periodStartUtc)
                .Select(u => new UserGrowthRow
                {
                    Day = u.CreatedAt.Date,
                    Role = u.Role.Name
                })
                .ToListAsync();

            var creatorRequestStatuses = await _context.Users
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

            var mapPoints = await _context.Destinations
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

            var geospatialSummary = await _context.Destinations
                .AsNoTracking()
                .Where(d => d.IsActive && d.Geolocation != null)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    RegionsRepresented = g.Select(x => x.RegionId).Distinct().Count()
                })
                .FirstOrDefaultAsync();

            var favoriteRows = await _context.Favorites
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x => x.DestinationId != null)
                .Select(x => new DashboardDestinationFavoriteRow
                {
                    DestinationId = x.DestinationId!.Value,
                    DestinationName = x.Destination!.Name,
                    RegionId = x.Destination.RegionId,
                    RegionName = x.Destination.Region.Name,
                    RegionCode = x.Destination.Region.Code,
                    UserId = x.UserId
                })
                .ToListAsync();

            var plannerRows = await _context.EventPlannerItems
                .AsNoTracking()
                .Where(x => x.AddedAt >= periodStartUtc)
                .Where(x => x.Event.DestinationId != null)
                .Select(x => new DashboardDestinationPlannerRow
                {
                    DestinationId = x.Event.DestinationId!.Value,
                    DestinationName = x.Event.Destination!.Name,
                    RegionId = x.Event.Destination.RegionId,
                    RegionName = x.Event.Destination.Region.Name,
                    RegionCode = x.Event.Destination.Region.Code,
                    UserId = x.UserId
                })
                .ToListAsync();

            var reviewRows = await _context.Reviews
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x => x.Status == ContentStatus.Approved)
                .Select(x => new DashboardDestinationReviewRow
                {
                    DestinationId = x.Object.DestinationId,
                    DestinationName = x.Object.Destination.Name,
                    RegionId = x.Object.Destination.RegionId,
                    RegionName = x.Object.Destination.Region.Name,
                    RegionCode = x.Object.Destination.Region.Code,
                    Rating = x.Rating
                })
                .ToListAsync();

            var reportsBreakdown = reportsBreakdownRows.ToDictionary(x => x.Status, x => x.Count);
            var roleDistributionLookup = roleDistributionRows.ToDictionary(x => x.Role, x => x.Count);
            var destinationEngagement = BuildDestinationEngagement(favoriteRows, plannerRows, reviewRows);

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
                    TotalTourists = totalTourists,
                    NewTouristsInPeriod = newTouristsInPeriod,
                    ActiveDestinations = activeDestinations,
                    NewDestinationsInPeriod = newDestinationsInPeriod,
                    PendingCreatorRequests = pendingCreatorRequests,
                    OpenReports = openReports
                },
                UserGrowth = BuildUserGrowth(periodStartUtc, asOfUtc, dashboardPeriod.Granularity, userGrowthRows),
                RoleDistribution = BuildRoleDistribution(roleDistributionLookup),
                DestinationsByRegion = destinationsByRegion,
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
                BanOverview = BuildBanOverview(bannedUsers),
                DestinationEngagement = destinationEngagement,
                GeospatialOverview = new AdminDashboardGeospatialOverviewDto
                {
                    TotalActiveDestinationsWithCoordinates = geospatialSummary?.Total ?? 0,
                    RegionsRepresented = geospatialSummary?.RegionsRepresented ?? 0,
                    DisplayedPoints = mapPoints.Count,
                    Points = mapPoints
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
                    _ => CreateDashboardPeriod(
                        "30d",
                        asOfUtc.Date.AddDays(-(Math.Clamp(days ?? DefaultPeriodDays, MinPeriodDays, MaxPeriodDays) - 1)),
                        asOfUtc,
                        ResolveGranularity(days ?? DefaultPeriodDays))
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

        private static AdminDashboardDestinationEngagementDto BuildDestinationEngagement(
            IReadOnlyList<DashboardDestinationFavoriteRow> favoriteRows,
            IReadOnlyList<DashboardDestinationPlannerRow> plannerRows,
            IReadOnlyList<DashboardDestinationReviewRow> reviewRows)
        {
            if (favoriteRows.Count == 0 && plannerRows.Count == 0 && reviewRows.Count == 0)
            {
                return new AdminDashboardDestinationEngagementDto();
            }

            var reviewLookup = reviewRows
                .GroupBy(x => x.DestinationId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        ReviewCount = g.Count(),
                        AverageRating = Math.Round((decimal)g.Average(x => x.Rating), 1)
                    });

            var favoriteLookup = favoriteRows
                .GroupBy(x => x.DestinationId)
                .ToDictionary(g => g.Key, g => g.Count());

            var plannerLookup = plannerRows
                .GroupBy(x => x.DestinationId)
                .ToDictionary(g => g.Key, g => g.Count());

            var destinationRows = favoriteRows
                .Select(x => new { x.DestinationId, x.DestinationName, x.RegionId, x.RegionName, x.RegionCode })
                .Concat(plannerRows.Select(x => new { x.DestinationId, x.DestinationName, x.RegionId, x.RegionName, x.RegionCode }))
                .Concat(reviewRows.Select(x => new { x.DestinationId, x.DestinationName, x.RegionId, x.RegionName, x.RegionCode }))
                .Distinct()
                .ToList();

            var topDestinations = destinationRows
                .Select(row =>
                {
                    var favoriteAdds = favoriteLookup.GetValueOrDefault(row.DestinationId);
                    var plannerAdds = plannerLookup.GetValueOrDefault(row.DestinationId);
                    var reviewInfo = reviewLookup.GetValueOrDefault(row.DestinationId);
                    var reviewCount = reviewInfo?.ReviewCount ?? 0;
                    var averageRating = reviewInfo?.AverageRating ?? 0m;
                    var engagementScore = favoriteAdds + plannerAdds + reviewCount;

                    return new AdminDashboardTopEngagedDestinationDto
                    {
                        DestinationId = row.DestinationId,
                        DestinationName = row.DestinationName,
                        RegionId = row.RegionId,
                        RegionName = row.RegionName,
                        RegionCode = row.RegionCode,
                        FavoriteAdds = favoriteAdds,
                        PlannerAdds = plannerAdds,
                        ReviewCount = reviewCount,
                        AverageRating = averageRating,
                        EngagementScore = engagementScore
                    };
                })
                .Where(x => x.EngagementScore > 0 || x.AverageRating > 0)
                .OrderByDescending(x => x.EngagementScore)
                .ThenByDescending(x => x.AverageRating)
                .ThenBy(x => x.DestinationName)
                .Take(MaxTopEngagedDestinations)
                .ToList();

            var regionRows = destinationRows
                .GroupBy(x => new { x.RegionId, x.RegionName, x.RegionCode })
                .Select(g =>
                {
                    var regionDestinationIds = g.Select(x => x.DestinationId).Distinct().ToHashSet();
                    var regionFavorites = favoriteLookup
                        .Where(x => regionDestinationIds.Contains(x.Key))
                        .Sum(x => x.Value);
                    var regionPlannerAdds = plannerLookup
                        .Where(x => regionDestinationIds.Contains(x.Key))
                        .Sum(x => x.Value);
                    var regionReviewSlice = reviewRows.Where(x => regionDestinationIds.Contains(x.DestinationId)).ToList();
                    var regionReviewCount = regionReviewSlice.Count;
                    var regionAverageRating = regionReviewCount > 0
                        ? Math.Round((decimal)regionReviewSlice.Average(x => x.Rating), 1)
                        : 0m;
                    var engagementScore = regionFavorites + regionPlannerAdds + regionReviewCount;

                    return new AdminDashboardRegionEngagementDto
                    {
                        RegionId = g.Key.RegionId,
                        RegionName = g.Key.RegionName,
                        RegionCode = g.Key.RegionCode,
                        FavoriteAdds = regionFavorites,
                        PlannerAdds = regionPlannerAdds,
                        ReviewCount = regionReviewCount,
                        EngagedDestinations = regionDestinationIds.Count,
                        AverageRating = regionAverageRating,
                        EngagementScore = engagementScore
                    };
                })
                .Where(x => x.EngagementScore > 0 || x.AverageRating > 0)
                .OrderByDescending(x => x.EngagementScore)
                .ThenByDescending(x => x.AverageRating)
                .ThenBy(x => x.RegionName)
                .Take(MaxTopEngagedRegions)
                .ToList();

            return new AdminDashboardDestinationEngagementDto
            {
                TotalFavoriteAdds = favoriteRows.Count,
                TotalPlannerAdds = plannerRows.Count,
                RatedDestinations = reviewRows.Select(x => x.DestinationId).Distinct().Count(),
                TopDestinations = topDestinations,
                RegionEngagement = regionRows
            };
        }

        private static AdminDashboardBanOverviewDto BuildBanOverview(
            IReadOnlyList<DashboardBannedUserRow> bannedUsers)
        {
            if (bannedUsers.Count == 0)
                return new AdminDashboardBanOverviewDto();

            var regionRows = bannedUsers
                .Select(x => new
                {
                    RegionId = x.PreferredRegionId ?? x.ManagedRegionId,
                    RegionName = x.PreferredRegionName ?? x.ManagedRegionName ?? "Unassigned",
                    RegionCode = x.PreferredRegionCode ?? x.ManagedRegionCode ?? "N/A",
                    x.TemporarilyBanned,
                    x.PermanentlyBanned
                })
                .GroupBy(x => new { x.RegionId, x.RegionName, x.RegionCode })
                .Select(g => new AdminDashboardBannedUsersByRegionDto
                {
                    RegionId = g.Key.RegionId,
                    RegionName = g.Key.RegionName,
                    RegionCode = g.Key.RegionCode,
                    TemporarilyBanned = g.Sum(x => x.TemporarilyBanned),
                    PermanentlyBanned = g.Sum(x => x.PermanentlyBanned),
                    TotalBanned = g.Sum(x => x.TemporarilyBanned + x.PermanentlyBanned)
                })
                .Where(x => !string.Equals(x.RegionCode, "GR", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(x => x.TotalBanned)
                .ThenBy(x => x.RegionName)
                .Take(MaxTopEngagedRegions)
                .ToList();

            return new AdminDashboardBanOverviewDto
            {
                TemporarilyBanned = bannedUsers.Sum(x => x.TemporarilyBanned),
                PermanentlyBanned = bannedUsers.Sum(x => x.PermanentlyBanned),
                TotalBanned = bannedUsers.Sum(x => x.TemporarilyBanned + x.PermanentlyBanned),
                Regions = regionRows
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
