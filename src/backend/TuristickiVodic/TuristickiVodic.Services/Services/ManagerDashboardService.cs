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
    public class ManagerDashboardService : IManagerDashboardService
    {
        private const int DefaultPeriodDays = 30;
        private const int MinPeriodDays = 7;
        private const int MaxPeriodDays = 1825;
        private const int MaxTopContentItems = 8;
        private const int MaxTopCreators = 6;
        private const int MaxLocalityItems = 6;
        private const int MaxUpcomingEvents = 6;

        private readonly AppDbContext _context;

        private sealed class DashboardPeriod
        {
            public string Key { get; init; } = "30d";
            public DateTime StartUtc { get; init; }
            public int Days { get; init; }
            public string Granularity { get; init; } = "day";
        }

        private sealed class StatusCountRow
        {
            public ContentStatus Status { get; set; }
            public int Count { get; set; }
        }

        private sealed class ManagerContentLocationRow
        {
            public string ContentType { get; set; } = string.Empty;
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public bool IsActive { get; set; }
            public int CreatorId { get; set; }
            public string CreatorName { get; set; } = string.Empty;
            public string CreatorEmail { get; set; } = string.Empty;
            public RoleType CreatorRole { get; set; }
            public int? LocalityId { get; set; }
            public string? LocalityName { get; set; }
        }

        private sealed class ManagerFavoriteRow
        {
            public DateTime Day { get; set; }
            public string ContentType { get; set; } = string.Empty;
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public int CreatorId { get; set; }
            public string CreatorName { get; set; } = string.Empty;
            public string CreatorEmail { get; set; } = string.Empty;
            public RoleType CreatorRole { get; set; }
            public int? LocalityId { get; set; }
            public string? LocalityName { get; set; }
        }

        private sealed class ManagerPlannerRow
        {
            public DateTime Day { get; set; }
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public int CreatorId { get; set; }
            public string CreatorName { get; set; } = string.Empty;
            public string CreatorEmail { get; set; } = string.Empty;
            public RoleType CreatorRole { get; set; }
            public int? LocalityId { get; set; }
            public string? LocalityName { get; set; }
        }

        private sealed class ManagerReviewRow
        {
            public DateTime Day { get; set; }
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public int CreatorId { get; set; }
            public string CreatorName { get; set; } = string.Empty;
            public string CreatorEmail { get; set; } = string.Empty;
            public RoleType CreatorRole { get; set; }
            public int Rating { get; set; }
            public bool HasCreatorResponse { get; set; }
            public int? LocalityId { get; set; }
            public string? LocalityName { get; set; }
        }

        private sealed class ManagerUpcomingEventRow
        {
            public int EventId { get; set; }
            public string EventName { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public int CreatorId { get; set; }
            public string CreatorName { get; set; } = string.Empty;
            public string CreatorEmail { get; set; } = string.Empty;
            public int? LocalityId { get; set; }
            public string? LocalityName { get; set; }
        }

        public ManagerDashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ManagerDashboardOverviewDto> GetOverviewAsync(int managerId, string? period = null, int? days = null)
        {
            var asOfUtc = DateTime.UtcNow;
            var dashboardPeriod = ResolveDashboardPeriod(asOfUtc, period, days);
            var periodStartUtc = dashboardPeriod.StartUtc;

            var manager = await _context.Users
                .AsNoTracking()
                .Where(x => x.Id == managerId)
                .Select(x => new
                {
                    x.ManagedDestinationId,
                    DestinationId = x.ManagedDestination != null ? (int?)x.ManagedDestination.Id : null,
                    DestinationName = x.ManagedDestination != null ? x.ManagedDestination.Name : null,
                    DisplayTitle = x.ManagedDestination != null ? x.ManagedDestination.DisplayTitle : null,
                    DestinationStatus = x.ManagedDestination != null ? (ContentStatus?)x.ManagedDestination.Status : null,
                    DestinationIsActive = x.ManagedDestination != null && x.ManagedDestination.IsActive,
                    RegionId = x.ManagedDestination != null ? (int?)x.ManagedDestination.RegionId : null,
                    RegionName = x.ManagedDestination != null ? x.ManagedDestination.Region.Name : null,
                    RegionCode = x.ManagedDestination != null ? x.ManagedDestination.Region.Code : null,
                    LocalityCount = x.ManagedDestination != null ? x.ManagedDestination.Localities.Count() : 0
                })
                .FirstOrDefaultAsync();

            if (manager == null)
            {
                throw new InvalidOperationException("Manager not found.");
            }

            if (!manager.ManagedDestinationId.HasValue || !manager.DestinationId.HasValue)
            {
                return new ManagerDashboardOverviewDto
                {
                    PeriodKey = dashboardPeriod.Key,
                    PeriodDays = dashboardPeriod.Days,
                    EngagementTrendGranularity = dashboardPeriod.Granularity,
                    AsOfUtc = asOfUtc,
                    PeriodStartUtc = periodStartUtc,
                    HasManagedDestination = false
                };
            }

            var destinationId = manager.ManagedDestinationId.Value;

            var contentLocations = await LoadContentLocationsAsync(destinationId);

            var objectStatusRows = await _context.Objects
                .AsNoTracking()
                .Where(x => x.DestinationId == destinationId)
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var eventStatusRows = await _context.Events
                .AsNoTracking()
                .Where(x =>
                    x.DestinationId == destinationId ||
                    (x.Locality != null && x.Locality.DestinationId == destinationId) ||
                    (x.Object != null && x.Object.DestinationId == destinationId))
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var activityStatusRows = await _context.Activities
                .AsNoTracking()
                .Where(x =>
                    x.DestinationId == destinationId ||
                    (x.Locality != null && x.Locality.DestinationId == destinationId) ||
                    (x.Object != null && x.Object.DestinationId == destinationId))
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var favoriteRows = await _context.Favorites
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x =>
                    (x.ObjectId != null && x.Object != null && x.Object.DestinationId == destinationId) ||
                    (x.ActivityId != null && x.Activity != null &&
                        (x.Activity.DestinationId == destinationId ||
                         (x.Activity.Locality != null && x.Activity.Locality.DestinationId == destinationId) ||
                         (x.Activity.Object != null && x.Activity.Object.DestinationId == destinationId))))
                .Select(x => new ManagerFavoriteRow
                {
                    Day = x.CreatedAt.Date,
                    ContentType = x.ObjectId != null ? "Object" : "Activity",
                    ContentId = x.ObjectId ?? x.ActivityId!.Value,
                    ContentName = x.ObjectId != null ? x.Object!.Name : x.Activity!.Name,
                    Status = x.ObjectId != null ? x.Object!.Status : x.Activity!.Status,
                    CreatorId = x.ObjectId != null ? x.Object!.CreatedByUserId : x.Activity!.CreatedByUserId,
                    CreatorName = x.ObjectId != null
                        ? ((x.Object!.CreatedBy.FirstName + " " + x.Object.CreatedBy.LastName).Trim())
                        : ((x.Activity!.CreatedBy.FirstName + " " + x.Activity.CreatedBy.LastName).Trim()),
                    CreatorEmail = x.ObjectId != null ? x.Object!.CreatedBy.Email : x.Activity!.CreatedBy.Email,
                    CreatorRole = x.ObjectId != null ? x.Object!.CreatedBy.Role.Name : x.Activity!.CreatedBy.Role.Name,
                    LocalityId = x.ObjectId != null
                        ? x.Object!.LocalityId
                        : (x.Activity!.LocalityId ?? (x.Activity.Object != null ? x.Activity.Object.LocalityId : null)),
                    LocalityName = x.ObjectId != null
                        ? (x.Object!.Locality != null ? x.Object.Locality.Name : null)
                        : (x.Activity!.Locality != null ? x.Activity.Locality.Name :
                            (x.Activity.Object != null && x.Activity.Object.Locality != null ? x.Activity.Object.Locality.Name : null))
                })
                .ToListAsync();

            var plannerRows = await _context.EventPlannerItems
                .AsNoTracking()
                .Where(x => x.AddedAt >= periodStartUtc)
                .Where(x =>
                    x.Event.DestinationId == destinationId ||
                    (x.Event.Locality != null && x.Event.Locality.DestinationId == destinationId) ||
                    (x.Event.Object != null && x.Event.Object.DestinationId == destinationId))
                .Select(x => new ManagerPlannerRow
                {
                    Day = x.AddedAt.Date,
                    ContentId = x.EventId,
                    ContentName = x.Event.Name,
                    Status = x.Event.Status,
                    CreatorId = x.Event.CreatedByUserId,
                    CreatorName = (x.Event.CreatedBy.FirstName + " " + x.Event.CreatedBy.LastName).Trim(),
                    CreatorEmail = x.Event.CreatedBy.Email,
                    CreatorRole = x.Event.CreatedBy.Role.Name,
                    LocalityId = x.Event.LocalityId ?? (x.Event.Object != null ? x.Event.Object.LocalityId : null),
                    LocalityName = x.Event.Locality != null ? x.Event.Locality.Name :
                        (x.Event.Object != null && x.Event.Object.Locality != null ? x.Event.Object.Locality.Name : null)
                })
                .ToListAsync();

            var reviewRows = await _context.Reviews
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x => x.Status == ContentStatus.Approved && x.Object.DestinationId == destinationId)
                .Select(x => new ManagerReviewRow
                {
                    Day = x.CreatedAt.Date,
                    ContentId = x.ObjectId,
                    ContentName = x.Object.Name,
                    Status = x.Object.Status,
                    CreatorId = x.Object.CreatedByUserId,
                    CreatorName = (x.Object.CreatedBy.FirstName + " " + x.Object.CreatedBy.LastName).Trim(),
                    CreatorEmail = x.Object.CreatedBy.Email,
                    CreatorRole = x.Object.CreatedBy.Role.Name,
                    Rating = x.Rating,
                    HasCreatorResponse = x.CreatorResponse != null && x.CreatorResponse != string.Empty,
                    LocalityId = x.Object.LocalityId,
                    LocalityName = x.Object.Locality != null ? x.Object.Locality.Name : null
                })
                .ToListAsync();

            var pendingDeletionRequests = await _context.DeletionRequests
                .AsNoTracking()
                .CountAsync(x =>
                    x.Status == ContentStatus.Pending &&
                    (
                        (x.Object != null && x.Object.DestinationId == destinationId) ||
                        (x.Event != null &&
                            (x.Event.DestinationId == destinationId ||
                             (x.Event.Locality != null && x.Event.Locality.DestinationId == destinationId) ||
                             (x.Event.Object != null && x.Event.Object.DestinationId == destinationId))) ||
                        (x.Activity != null &&
                            (x.Activity.DestinationId == destinationId ||
                             (x.Activity.Locality != null && x.Activity.Locality.DestinationId == destinationId) ||
                             (x.Activity.Object != null && x.Activity.Object.DestinationId == destinationId)))
                    ));

            var currentPendingReports = await _context.ManagerReports
                .AsNoTracking()
                .CountAsync(x => x.ManagerId == managerId && x.Status == ContentStatus.Pending);

            var reportStatusRows = await _context.ManagerReports
                .AsNoTracking()
                .Where(x => x.ManagerId == managerId && x.CreatedAt >= periodStartUtc)
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var upcomingEvents = await LoadUpcomingEventsAsync(destinationId, asOfUtc);

            var objectBucket = BuildStatusBucket(objectStatusRows);
            var eventBucket = BuildStatusBucket(eventStatusRows);
            var activityBucket = BuildStatusBucket(activityStatusRows);
            var overallBucket = SumBuckets(objectBucket, eventBucket, activityBucket);
            var reportsBreakdown = reportStatusRows.ToDictionary(x => x.Status, x => x.Count);

            var activeCreators = contentLocations
                .Where(x => x.CreatorRole == RoleType.ContentCreator && x.Status == ContentStatus.Approved && x.IsActive)
                .Select(x => x.CreatorId)
                .Distinct()
                .Count();

            var activeObjects = contentLocations.Count(x => x.ContentType == "Object" && x.Status == ContentStatus.Approved && x.IsActive);
            var activeEvents = contentLocations.Count(x => x.ContentType == "Event" && x.Status == ContentStatus.Approved && x.IsActive);
            var activeActivities = contentLocations.Count(x => x.ContentType == "Activity" && x.Status == ContentStatus.Approved && x.IsActive);

            var moderationQueue = new ManagerDashboardModerationQueueDto
            {
                PendingObjects = objectBucket.Pending,
                PendingEvents = eventBucket.Pending,
                PendingActivities = activityBucket.Pending,
                PendingDeletionRequests = pendingDeletionRequests,
                TotalPending = objectBucket.Pending + eventBucket.Pending + activityBucket.Pending + pendingDeletionRequests
            };

            return new ManagerDashboardOverviewDto
            {
                PeriodKey = dashboardPeriod.Key,
                PeriodDays = dashboardPeriod.Days,
                EngagementTrendGranularity = dashboardPeriod.Granularity,
                AsOfUtc = asOfUtc,
                PeriodStartUtc = periodStartUtc,
                HasManagedDestination = true,
                Destination = new ManagerDashboardDestinationDto
                {
                    DestinationId = manager.DestinationId.Value,
                    DestinationName = manager.DestinationName ?? "Managed destination",
                    DisplayTitle = manager.DisplayTitle,
                    Status = (manager.DestinationStatus ?? ContentStatus.Pending).ToString(),
                    IsActive = manager.DestinationIsActive,
                    RegionId = manager.RegionId ?? 0,
                    RegionName = manager.RegionName ?? string.Empty,
                    RegionCode = manager.RegionCode ?? string.Empty,
                    LocalityCount = manager.LocalityCount
                },
                Summary = new ManagerDashboardSummaryDto
                {
                    ActiveCreators = activeCreators,
                    ActiveObjects = activeObjects,
                    ActiveEvents = activeEvents,
                    ActiveActivities = activeActivities,
                    PendingModerationItems = moderationQueue.TotalPending,
                    OpenReports = currentPendingReports,
                    FavoritesInPeriod = favoriteRows.Count,
                    PlannerAddsInPeriod = plannerRows.Count,
                    NewReviewsInPeriod = reviewRows.Count,
                    UnansweredReviews = reviewRows.Count(x => !x.HasCreatorResponse),
                    LowRatedReviewsInPeriod = reviewRows.Count(x => x.Rating <= 2),
                    AverageRatingInPeriod = reviewRows.Count > 0
                        ? Math.Round((decimal)reviewRows.Average(x => x.Rating), 1)
                        : 0m,
                    UpcomingEventsInNext30Days = upcomingEvents.Next30Days
                },
                ModerationQueue = moderationQueue,
                Reports = new ManagerDashboardReportsDto
                {
                    CurrentPending = currentPendingReports,
                    SubmittedInPeriod = reportStatusRows.Sum(x => x.Count),
                    ApprovedInPeriod = reportsBreakdown.GetValueOrDefault(ContentStatus.Approved),
                    RejectedInPeriod = reportsBreakdown.GetValueOrDefault(ContentStatus.Rejected),
                    TotalInPeriod = reportStatusRows.Sum(x => x.Count)
                },
                ContentStatus = new ManagerDashboardContentStatusDto
                {
                    Overall = overallBucket,
                    Objects = objectBucket,
                    Events = eventBucket,
                    Activities = activityBucket
                },
                EngagementTrend = BuildEngagementTrend(periodStartUtc, asOfUtc, dashboardPeriod.Granularity, favoriteRows, plannerRows, reviewRows),
                TopContent = BuildTopContent(contentLocations, favoriteRows, plannerRows, reviewRows),
                TopCreators = BuildTopCreators(contentLocations, favoriteRows, plannerRows, reviewRows),
                LocalityPerformance = BuildLocalityPerformance(contentLocations, favoriteRows, plannerRows, reviewRows),
                UpcomingEvents = upcomingEvents
            };
        }

        private async Task<List<ManagerContentLocationRow>> LoadContentLocationsAsync(int destinationId)
        {
            var objectRows = await _context.Objects
                .AsNoTracking()
                .Where(x => x.DestinationId == destinationId)
                .Select(x => new ManagerContentLocationRow
                {
                    ContentType = "Object",
                    ContentId = x.Id,
                    ContentName = x.Name,
                    Status = x.Status,
                    IsActive = x.IsActive,
                    CreatorId = x.CreatedByUserId,
                    CreatorName = (x.CreatedBy.FirstName + " " + x.CreatedBy.LastName).Trim(),
                    CreatorEmail = x.CreatedBy.Email,
                    CreatorRole = x.CreatedBy.Role.Name,
                    LocalityId = x.LocalityId,
                    LocalityName = x.Locality != null ? x.Locality.Name : null
                })
                .ToListAsync();

            var eventRows = await _context.Events
                .AsNoTracking()
                .Where(x =>
                    x.DestinationId == destinationId ||
                    (x.Locality != null && x.Locality.DestinationId == destinationId) ||
                    (x.Object != null && x.Object.DestinationId == destinationId))
                .Select(x => new ManagerContentLocationRow
                {
                    ContentType = "Event",
                    ContentId = x.Id,
                    ContentName = x.Name,
                    Status = x.Status,
                    IsActive = x.IsActive,
                    CreatorId = x.CreatedByUserId,
                    CreatorName = (x.CreatedBy.FirstName + " " + x.CreatedBy.LastName).Trim(),
                    CreatorEmail = x.CreatedBy.Email,
                    CreatorRole = x.CreatedBy.Role.Name,
                    LocalityId = x.LocalityId ?? (x.Object != null ? x.Object.LocalityId : null),
                    LocalityName = x.Locality != null ? x.Locality.Name :
                        (x.Object != null && x.Object.Locality != null ? x.Object.Locality.Name : null)
                })
                .ToListAsync();

            var activityRows = await _context.Activities
                .AsNoTracking()
                .Where(x =>
                    x.DestinationId == destinationId ||
                    (x.Locality != null && x.Locality.DestinationId == destinationId) ||
                    (x.Object != null && x.Object.DestinationId == destinationId))
                .Select(x => new ManagerContentLocationRow
                {
                    ContentType = "Activity",
                    ContentId = x.Id,
                    ContentName = x.Name,
                    Status = x.Status,
                    IsActive = x.IsActive,
                    CreatorId = x.CreatedByUserId,
                    CreatorName = (x.CreatedBy.FirstName + " " + x.CreatedBy.LastName).Trim(),
                    CreatorEmail = x.CreatedBy.Email,
                    CreatorRole = x.CreatedBy.Role.Name,
                    LocalityId = x.LocalityId ?? (x.Object != null ? x.Object.LocalityId : null),
                    LocalityName = x.Locality != null ? x.Locality.Name :
                        (x.Object != null && x.Object.Locality != null ? x.Object.Locality.Name : null)
                })
                .ToListAsync();

            return objectRows
                .Concat(eventRows)
                .Concat(activityRows)
                .ToList();
        }

        private async Task<ManagerDashboardUpcomingEventsDto> LoadUpcomingEventsAsync(int destinationId, DateTime asOfUtc)
        {
            var next30Cutoff = asOfUtc.AddDays(30);
            var next7Cutoff = asOfUtc.AddDays(7);

            var rows = await _context.Events
                .AsNoTracking()
                .Where(x =>
                    x.Status == ContentStatus.Approved &&
                    x.IsActive &&
                    x.StartDate >= asOfUtc &&
                    x.StartDate <= next30Cutoff &&
                    (x.DestinationId == destinationId ||
                     (x.Locality != null && x.Locality.DestinationId == destinationId) ||
                     (x.Object != null && x.Object.DestinationId == destinationId)))
                .OrderBy(x => x.StartDate)
                .Select(x => new ManagerUpcomingEventRow
                {
                    EventId = x.Id,
                    EventName = x.Name,
                    StartDate = x.StartDate,
                    CreatorId = x.CreatedByUserId,
                    CreatorName = (x.CreatedBy.FirstName + " " + x.CreatedBy.LastName).Trim(),
                    CreatorEmail = x.CreatedBy.Email,
                    LocalityId = x.LocalityId ?? (x.Object != null ? x.Object.LocalityId : null),
                    LocalityName = x.Locality != null ? x.Locality.Name :
                        (x.Object != null && x.Object.Locality != null ? x.Object.Locality.Name : null)
                })
                .ToListAsync();

            return new ManagerDashboardUpcomingEventsDto
            {
                Next7Days = rows.Count(x => x.StartDate <= next7Cutoff),
                Next30Days = rows.Count,
                Items = rows
                    .Take(MaxUpcomingEvents)
                    .Select(x => new ManagerDashboardUpcomingEventItemDto
                    {
                        EventId = x.EventId,
                        EventName = x.EventName,
                        StartDate = x.StartDate,
                        CreatorId = x.CreatorId,
                        CreatorName = x.CreatorName,
                        CreatorEmail = x.CreatorEmail,
                        LocalityId = x.LocalityId,
                        LocalityName = x.LocalityName
                    })
                    .ToList()
            };
        }

        private static ManagerDashboardStatusBucketDto BuildStatusBucket(IReadOnlyList<StatusCountRow> rows)
        {
            return new ManagerDashboardStatusBucketDto
            {
                Published = rows.Where(x => x.Status == ContentStatus.Approved).Sum(x => x.Count),
                Pending = rows.Where(x => x.Status == ContentStatus.Pending).Sum(x => x.Count),
                Rejected = rows.Where(x => x.Status == ContentStatus.Rejected).Sum(x => x.Count),
                Total = rows.Sum(x => x.Count)
            };
        }

        private static ManagerDashboardStatusBucketDto SumBuckets(params ManagerDashboardStatusBucketDto[] buckets)
        {
            return new ManagerDashboardStatusBucketDto
            {
                Published = buckets.Sum(x => x.Published),
                Pending = buckets.Sum(x => x.Pending),
                Rejected = buckets.Sum(x => x.Rejected),
                Total = buckets.Sum(x => x.Total)
            };
        }

        private static List<ManagerDashboardTrendPointDto> BuildEngagementTrend(
            DateTime periodStartUtc,
            DateTime asOfUtc,
            string granularity,
            IReadOnlyList<ManagerFavoriteRow> favoriteRows,
            IReadOnlyList<ManagerPlannerRow> plannerRows,
            IReadOnlyList<ManagerReviewRow> reviewRows)
        {
            var buckets = BuildBuckets(periodStartUtc.Date, asOfUtc.Date, granularity);

            var favoritesLookup = favoriteRows
                .GroupBy(x => GetBucketStart(x.Day.Date, periodStartUtc.Date, granularity))
                .ToDictionary(g => g.Key, g => g.Count());

            var plannerLookup = plannerRows
                .GroupBy(x => GetBucketStart(x.Day.Date, periodStartUtc.Date, granularity))
                .ToDictionary(g => g.Key, g => g.Count());

            var reviewLookup = reviewRows
                .GroupBy(x => GetBucketStart(x.Day.Date, periodStartUtc.Date, granularity))
                .ToDictionary(g => g.Key, g => g.Count());

            return buckets
                .Select(bucket => new ManagerDashboardTrendPointDto
                {
                    Date = bucket,
                    Favorites = favoritesLookup.GetValueOrDefault(bucket),
                    PlannerAdds = plannerLookup.GetValueOrDefault(bucket),
                    Reviews = reviewLookup.GetValueOrDefault(bucket)
                })
                .ToList();
        }

        private static List<ManagerDashboardTopContentItemDto> BuildTopContent(
            IReadOnlyList<ManagerContentLocationRow> contentLocations,
            IReadOnlyList<ManagerFavoriteRow> favoriteRows,
            IReadOnlyList<ManagerPlannerRow> plannerRows,
            IReadOnlyList<ManagerReviewRow> reviewRows)
        {
            var contentLookup = contentLocations.ToDictionary(
                x => (x.ContentType, x.ContentId),
                x => x);

            var favoriteLookup = favoriteRows
                .GroupBy(x => (x.ContentType, x.ContentId))
                .ToDictionary(g => g.Key, g => g.Count());

            var plannerLookup = plannerRows
                .GroupBy(x => x.ContentId)
                .ToDictionary(g => g.Key, g => g.Count());

            var reviewLookup = reviewRows
                .GroupBy(x => x.ContentId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Count = g.Count(),
                        AverageRating = Math.Round((decimal)g.Average(x => x.Rating), 1)
                    });

            var keys = favoriteLookup.Keys
                .Concat(plannerLookup.Keys.Select(x => ("Event", x)))
                .Concat(reviewLookup.Keys.Select(x => ("Object", x)))
                .Distinct()
                .ToList();

            return keys
                .Select(key =>
                {
                    var meta = contentLookup.GetValueOrDefault(key);
                    if (meta == null)
                    {
                        return null;
                    }

                    var favoriteAdds = favoriteLookup.GetValueOrDefault(key);
                    var plannerAdds = key.Item1 == "Event" ? plannerLookup.GetValueOrDefault(key.Item2) : 0;
                    var reviewInfo = key.Item1 == "Object" ? reviewLookup.GetValueOrDefault(key.Item2) : null;
                    var reviewCount = reviewInfo?.Count ?? 0;
                    var averageRating = reviewInfo?.AverageRating ?? 0m;
                    var engagementScore = favoriteAdds + (plannerAdds * 2) + (reviewCount * 3);

                    return new ManagerDashboardTopContentItemDto
                    {
                        ContentType = meta.ContentType,
                        ContentId = meta.ContentId,
                        ContentName = meta.ContentName,
                        Status = meta.Status.ToString(),
                        CreatorId = meta.CreatorId,
                        CreatorName = meta.CreatorName,
                        CreatorEmail = meta.CreatorEmail,
                        LocalityId = meta.LocalityId,
                        LocalityName = NormalizeLocalityName(meta.LocalityName),
                        FavoriteAdds = favoriteAdds,
                        PlannerAdds = plannerAdds,
                        ReviewCount = reviewCount,
                        AverageRating = averageRating,
                        EngagementScore = engagementScore
                    };
                })
                .Where(x => x != null && (x.EngagementScore > 0 || x.AverageRating > 0))
                .OrderByDescending(x => x!.EngagementScore)
                .ThenByDescending(x => x!.AverageRating)
                .ThenBy(x => x!.ContentName)
                .Take(MaxTopContentItems)
                .Select(x => x!)
                .ToList();
        }

        private static List<ManagerDashboardTopCreatorItemDto> BuildTopCreators(
            IReadOnlyList<ManagerContentLocationRow> contentLocations,
            IReadOnlyList<ManagerFavoriteRow> favoriteRows,
            IReadOnlyList<ManagerPlannerRow> plannerRows,
            IReadOnlyList<ManagerReviewRow> reviewRows)
        {
            var creatorContentRows = contentLocations
                .Where(x => x.CreatorRole == RoleType.ContentCreator)
                .ToList();

            var contentGroups = creatorContentRows
                .GroupBy(x => new { x.CreatorId, x.CreatorName, x.CreatorEmail })
                .ToDictionary(
                    g => g.Key.CreatorId,
                    g => new
                    {
                        g.Key.CreatorName,
                        g.Key.CreatorEmail,
                        ContentItems = g.Select(x => (x.ContentType, x.ContentId)).Distinct().Count(),
                        PublishedItems = g.Count(x => x.Status == ContentStatus.Approved),
                        PendingItems = g.Count(x => x.Status == ContentStatus.Pending)
                    });

            var favoriteLookup = favoriteRows
                .Where(x => x.CreatorRole == RoleType.ContentCreator)
                .GroupBy(x => x.CreatorId)
                .ToDictionary(g => g.Key, g => g.Count());

            var plannerLookup = plannerRows
                .Where(x => x.CreatorRole == RoleType.ContentCreator)
                .GroupBy(x => x.CreatorId)
                .ToDictionary(g => g.Key, g => g.Count());

            var reviewLookup = reviewRows
                .Where(x => x.CreatorRole == RoleType.ContentCreator)
                .GroupBy(x => x.CreatorId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Count = g.Count(),
                        AverageRating = Math.Round((decimal)g.Average(x => x.Rating), 1)
                    });

            return contentGroups
                .Select(kvp =>
                {
                    var creatorId = kvp.Key;
                    var meta = kvp.Value;
                    var favoriteAdds = favoriteLookup.GetValueOrDefault(creatorId);
                    var plannerAdds = plannerLookup.GetValueOrDefault(creatorId);
                    var reviewInfo = reviewLookup.GetValueOrDefault(creatorId);
                    var reviewCount = reviewInfo?.Count ?? 0;
                    var averageRating = reviewInfo?.AverageRating ?? 0m;
                    var engagementScore = favoriteAdds + (plannerAdds * 2) + (reviewCount * 3);

                    return new ManagerDashboardTopCreatorItemDto
                    {
                        CreatorId = creatorId,
                        CreatorName = meta.CreatorName,
                        CreatorEmail = meta.CreatorEmail,
                        ContentItems = meta.ContentItems,
                        PublishedItems = meta.PublishedItems,
                        PendingItems = meta.PendingItems,
                        FavoriteAdds = favoriteAdds,
                        PlannerAdds = plannerAdds,
                        ReviewCount = reviewCount,
                        AverageRating = averageRating,
                        EngagementScore = engagementScore
                    };
                })
                .OrderByDescending(x => x.EngagementScore)
                .ThenByDescending(x => x.AverageRating)
                .ThenByDescending(x => x.PublishedItems)
                .ThenBy(x => x.CreatorName)
                .Take(MaxTopCreators)
                .ToList();
        }

        private static List<ManagerDashboardLocalityPerformanceItemDto> BuildLocalityPerformance(
            IReadOnlyList<ManagerContentLocationRow> contentLocations,
            IReadOnlyList<ManagerFavoriteRow> favoriteRows,
            IReadOnlyList<ManagerPlannerRow> plannerRows,
            IReadOnlyList<ManagerReviewRow> reviewRows)
        {
            static string NormalizeName(string? name) => NormalizeLocalityName(name);

            var contentGroups = contentLocations
                .GroupBy(x => new { x.LocalityId, Name = NormalizeName(x.LocalityName) })
                .ToDictionary(
                    g => (g.Key.LocalityId, g.Key.Name),
                    g => g.Select(x => (x.ContentType, x.ContentId)).Distinct().Count());

            var favoriteLookup = favoriteRows
                .GroupBy(x => (x.LocalityId, Name: NormalizeName(x.LocalityName)))
                .ToDictionary(g => g.Key, g => g.Count());

            var plannerLookup = plannerRows
                .GroupBy(x => (x.LocalityId, Name: NormalizeName(x.LocalityName)))
                .ToDictionary(g => g.Key, g => g.Count());

            var reviewLookup = reviewRows
                .GroupBy(x => (x.LocalityId, Name: NormalizeName(x.LocalityName)))
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Count = g.Count(),
                        AverageRating = Math.Round((decimal)g.Average(x => x.Rating), 1)
                    });

            var keys = contentGroups.Keys
                .Concat(favoriteLookup.Keys)
                .Concat(plannerLookup.Keys)
                .Concat(reviewLookup.Keys)
                .Distinct()
                .ToList();

            return keys
                .Select(key =>
                {
                    var contentItems = contentGroups.GetValueOrDefault(key);
                    var favoriteAdds = favoriteLookup.GetValueOrDefault(key);
                    var plannerAdds = plannerLookup.GetValueOrDefault(key);
                    var reviewInfo = reviewLookup.GetValueOrDefault(key);
                    var reviewCount = reviewInfo?.Count ?? 0;
                    var averageRating = reviewInfo?.AverageRating ?? 0m;
                    var engagementScore = favoriteAdds + (plannerAdds * 2) + (reviewCount * 3);

                    return new ManagerDashboardLocalityPerformanceItemDto
                    {
                        LocalityId = key.LocalityId,
                        LocalityName = key.Name,
                        ContentItems = contentItems,
                        FavoriteAdds = favoriteAdds,
                        PlannerAdds = plannerAdds,
                        ReviewCount = reviewCount,
                        AverageRating = averageRating,
                        EngagementScore = engagementScore
                    };
                })
                .Where(x => x.ContentItems > 0 || x.EngagementScore > 0)
                .OrderByDescending(x => x.EngagementScore)
                .ThenByDescending(x => x.AverageRating)
                .ThenByDescending(x => x.ContentItems)
                .ThenBy(x => x.LocalityName)
                .Take(MaxLocalityItems)
                .ToList();
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

        private static string NormalizeLocalityName(string? localityName)
            => string.IsNullOrWhiteSpace(localityName) ? "Main destination" : localityName.Trim();
    }
}
