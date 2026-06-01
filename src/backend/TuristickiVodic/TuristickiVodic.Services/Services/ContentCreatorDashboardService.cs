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
    public class ContentCreatorDashboardService : IContentCreatorDashboardService
    {
        private const int DefaultPeriodDays = 30;
        private const int MinPeriodDays = 7;
        private const int MaxPeriodDays = 1825;
        private const int MaxTopContentItems = 8;
        private const int MaxTopDestinations = 6;
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

        private sealed class CreatorFavoriteRow
        {
            public DateTime Day { get; set; }
            public string ContentType { get; set; } = string.Empty;
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public int? DestinationId { get; set; }
            public string? DestinationName { get; set; }
            public int? RegionId { get; set; }
            public string? RegionName { get; set; }
            public string? RegionCode { get; set; }
        }

        private sealed class CreatorPlannerRow
        {
            public DateTime Day { get; set; }
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public int? DestinationId { get; set; }
            public string? DestinationName { get; set; }
            public int? RegionId { get; set; }
            public string? RegionName { get; set; }
            public string? RegionCode { get; set; }
        }

        private sealed class CreatorReviewRow
        {
            public DateTime Day { get; set; }
            public int ContentId { get; set; }
            public string ContentName { get; set; } = string.Empty;
            public ContentStatus Status { get; set; }
            public int DestinationId { get; set; }
            public string DestinationName { get; set; } = string.Empty;
            public int RegionId { get; set; }
            public string RegionName { get; set; } = string.Empty;
            public string RegionCode { get; set; } = string.Empty;
            public int Rating { get; set; }
        }

        private sealed class CreatorContentLocationRow
        {
            public string ContentType { get; set; } = string.Empty;
            public int ContentId { get; set; }
            public int? DestinationId { get; set; }
            public string? DestinationName { get; set; }
            public int? RegionId { get; set; }
            public string? RegionName { get; set; }
            public string? RegionCode { get; set; }
        }

        private sealed class CreatorUpcomingEventRow
        {
            public int EventId { get; set; }
            public string EventName { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public int? DestinationId { get; set; }
            public string? DestinationName { get; set; }
            public int? RegionId { get; set; }
            public string? RegionName { get; set; }
            public string? RegionCode { get; set; }
        }

        public ContentCreatorDashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ContentCreatorDashboardOverviewDto> GetOverviewAsync(int creatorId, string? period = null, int? days = null)
        {
            var asOfUtc = DateTime.UtcNow;
            var dashboardPeriod = ResolveDashboardPeriod(asOfUtc, period, days);
            var periodStartUtc = dashboardPeriod.StartUtc;

            var objectStatusRows = await _context.Objects
                .AsNoTracking()
                .Where(x => x.CreatedByUserId == creatorId)
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var eventStatusRows = await _context.Events
                .AsNoTracking()
                .Where(x => x.CreatedByUserId == creatorId)
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var activityStatusRows = await _context.Activities
                .AsNoTracking()
                .Where(x => x.CreatedByUserId == creatorId)
                .GroupBy(x => x.Status)
                .Select(g => new StatusCountRow
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var objectFavoriteRows = await _context.Favorites
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x => x.ObjectId != null && x.Object != null && x.Object.CreatedByUserId == creatorId)
                .Select(x => new CreatorFavoriteRow
                {
                    Day = x.CreatedAt.Date,
                    ContentType = "Object",
                    ContentId = x.ObjectId!.Value,
                    ContentName = x.Object!.Name,
                    Status = x.Object.Status,
                    DestinationId = x.Object.DestinationId,
                    DestinationName = x.Object.Destination.Name,
                    RegionId = x.Object.Destination.RegionId,
                    RegionName = x.Object.Destination.Region.Name,
                    RegionCode = x.Object.Destination.Region.Code
                })
                .ToListAsync();

            var activityFavoriteRows = await _context.Favorites
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x => x.ActivityId != null && x.Activity != null && x.Activity.CreatedByUserId == creatorId)
                .Select(x => new CreatorFavoriteRow
                {
                    Day = x.CreatedAt.Date,
                    ContentType = "Activity",
                    ContentId = x.ActivityId!.Value,
                    ContentName = x.Activity!.Name,
                    Status = x.Activity.Status,
                    DestinationId = x.Activity.DestinationId ??
                        (x.Activity.Locality != null ? (int?)x.Activity.Locality.DestinationId :
                        (x.Activity.Object != null ? (int?)x.Activity.Object.DestinationId : null)),
                    DestinationName = x.Activity.Destination != null ? x.Activity.Destination.Name :
                        (x.Activity.Locality != null ? x.Activity.Locality.Destination.Name :
                        (x.Activity.Object != null ? x.Activity.Object.Destination.Name : null)),
                    RegionId = x.Activity.Destination != null ? (int?)x.Activity.Destination.RegionId :
                        (x.Activity.Locality != null ? (int?)x.Activity.Locality.Destination.RegionId :
                        (x.Activity.Object != null ? (int?)x.Activity.Object.Destination.RegionId : null)),
                    RegionName = x.Activity.Destination != null ? x.Activity.Destination.Region.Name :
                        (x.Activity.Locality != null ? x.Activity.Locality.Destination.Region.Name :
                        (x.Activity.Object != null ? x.Activity.Object.Destination.Region.Name : null)),
                    RegionCode = x.Activity.Destination != null ? x.Activity.Destination.Region.Code :
                        (x.Activity.Locality != null ? x.Activity.Locality.Destination.Region.Code :
                        (x.Activity.Object != null ? x.Activity.Object.Destination.Region.Code : null))
                })
                .ToListAsync();

            var favoriteRows = objectFavoriteRows
                .Concat(activityFavoriteRows)
                .ToList();

            var plannerRows = await _context.EventPlannerItems
                .AsNoTracking()
                .Where(x => x.AddedAt >= periodStartUtc && x.Event.CreatedByUserId == creatorId)
                .Select(x => new CreatorPlannerRow
                {
                    Day = x.AddedAt.Date,
                    ContentId = x.EventId,
                    ContentName = x.Event.Name,
                    Status = x.Event.Status,
                    DestinationId = x.Event.DestinationId ??
                        (x.Event.Locality != null ? (int?)x.Event.Locality.DestinationId :
                        (x.Event.Object != null ? (int?)x.Event.Object.DestinationId : null)),
                    DestinationName = x.Event.Destination != null ? x.Event.Destination.Name :
                        (x.Event.Locality != null ? x.Event.Locality.Destination.Name :
                        (x.Event.Object != null ? x.Event.Object.Destination.Name : null)),
                    RegionId = x.Event.Destination != null ? (int?)x.Event.Destination.RegionId :
                        (x.Event.Locality != null ? (int?)x.Event.Locality.Destination.RegionId :
                        (x.Event.Object != null ? (int?)x.Event.Object.Destination.RegionId : null)),
                    RegionName = x.Event.Destination != null ? x.Event.Destination.Region.Name :
                        (x.Event.Locality != null ? x.Event.Locality.Destination.Region.Name :
                        (x.Event.Object != null ? x.Event.Object.Destination.Region.Name : null)),
                    RegionCode = x.Event.Destination != null ? x.Event.Destination.Region.Code :
                        (x.Event.Locality != null ? x.Event.Locality.Destination.Region.Code :
                        (x.Event.Object != null ? x.Event.Object.Destination.Region.Code : null))
                })
                .ToListAsync();

            var reviewRows = await _context.Reviews
                .AsNoTracking()
                .Where(x => x.CreatedAt >= periodStartUtc)
                .Where(x => x.Status == ContentStatus.Approved && x.Object.CreatedByUserId == creatorId)
                .Select(x => new CreatorReviewRow
                {
                    Day = x.CreatedAt.Date,
                    ContentId = x.ObjectId,
                    ContentName = x.Object.Name,
                    Status = x.Object.Status,
                    DestinationId = x.Object.DestinationId,
                    DestinationName = x.Object.Destination.Name,
                    RegionId = x.Object.Destination.RegionId,
                    RegionName = x.Object.Destination.Region.Name,
                    RegionCode = x.Object.Destination.Region.Code,
                    Rating = x.Rating
                })
                .ToListAsync();

            var unansweredReviews = await _context.Reviews
                .AsNoTracking()
                .CountAsync(x =>
                    x.CreatedAt >= periodStartUtc &&
                    x.Status == ContentStatus.Approved &&
                    x.Object.CreatedByUserId == creatorId &&
                    (x.CreatorResponse == null || x.CreatorResponse == ""));

            var contentLocations = await LoadContentLocationsAsync(creatorId);
            var upcomingEvents = await LoadUpcomingEventsAsync(creatorId, asOfUtc);

            var objectBucket = BuildStatusBucket(objectStatusRows);
            var eventBucket = BuildStatusBucket(eventStatusRows);
            var activityBucket = BuildStatusBucket(activityStatusRows);
            var overallBucket = SumBuckets(objectBucket, eventBucket, activityBucket);

            return new ContentCreatorDashboardOverviewDto
            {
                PeriodKey = dashboardPeriod.Key,
                PeriodDays = dashboardPeriod.Days,
                EngagementTrendGranularity = dashboardPeriod.Granularity,
                AsOfUtc = asOfUtc,
                PeriodStartUtc = periodStartUtc,
                Summary = new ContentCreatorDashboardSummaryDto
                {
                    TotalContent = overallBucket.Total,
                    PublishedContent = overallBucket.Published,
                    PendingContent = overallBucket.Pending,
                    RejectedContent = overallBucket.Rejected,
                    FavoritesInPeriod = favoriteRows.Count,
                    PlannerAddsInPeriod = plannerRows.Count,
                    NewReviewsInPeriod = reviewRows.Count,
                    UnansweredReviews = unansweredReviews,
                    AverageRatingInPeriod = reviewRows.Count > 0
                        ? Math.Round((decimal)reviewRows.Average(x => x.Rating), 1)
                        : 0m,
                    UpcomingEventsInNext30Days = upcomingEvents.Next30Days
                },
                ContentStatus = new ContentCreatorDashboardContentStatusDto
                {
                    Overall = overallBucket,
                    Objects = objectBucket,
                    Events = eventBucket,
                    Activities = activityBucket
                },
                EngagementTrend = BuildEngagementTrend(periodStartUtc, asOfUtc, dashboardPeriod.Granularity, favoriteRows, plannerRows, reviewRows),
                TopContent = BuildTopContent(favoriteRows, plannerRows, reviewRows),
                TopDestinations = BuildTopDestinations(contentLocations, favoriteRows, plannerRows, reviewRows),
                RatingDistribution = BuildRatingDistribution(reviewRows),
                UpcomingEvents = upcomingEvents
            };
        }

        private async Task<List<CreatorContentLocationRow>> LoadContentLocationsAsync(int creatorId)
        {
            var objectRows = await _context.Objects
                .AsNoTracking()
                .Where(x => x.CreatedByUserId == creatorId)
                .Select(x => new CreatorContentLocationRow
                {
                    ContentType = "Object",
                    ContentId = x.Id,
                    DestinationId = x.DestinationId,
                    DestinationName = x.Destination.Name,
                    RegionId = x.Destination.RegionId,
                    RegionName = x.Destination.Region.Name,
                    RegionCode = x.Destination.Region.Code
                })
                .ToListAsync();

            var eventRows = await _context.Events
                .AsNoTracking()
                .Where(x => x.CreatedByUserId == creatorId)
                .Select(x => new CreatorContentLocationRow
                {
                    ContentType = "Event",
                    ContentId = x.Id,
                    DestinationId = x.DestinationId ??
                        (x.Locality != null ? (int?)x.Locality.DestinationId :
                        (x.Object != null ? (int?)x.Object.DestinationId : null)),
                    DestinationName = x.Destination != null ? x.Destination.Name :
                        (x.Locality != null ? x.Locality.Destination.Name :
                        (x.Object != null ? x.Object.Destination.Name : null)),
                    RegionId = x.Destination != null ? (int?)x.Destination.RegionId :
                        (x.Locality != null ? (int?)x.Locality.Destination.RegionId :
                        (x.Object != null ? (int?)x.Object.Destination.RegionId : null)),
                    RegionName = x.Destination != null ? x.Destination.Region.Name :
                        (x.Locality != null ? x.Locality.Destination.Region.Name :
                        (x.Object != null ? x.Object.Destination.Region.Name : null)),
                    RegionCode = x.Destination != null ? x.Destination.Region.Code :
                        (x.Locality != null ? x.Locality.Destination.Region.Code :
                        (x.Object != null ? x.Object.Destination.Region.Code : null))
                })
                .ToListAsync();

            var activityRows = await _context.Activities
                .AsNoTracking()
                .Where(x => x.CreatedByUserId == creatorId)
                .Select(x => new CreatorContentLocationRow
                {
                    ContentType = "Activity",
                    ContentId = x.Id,
                    DestinationId = x.DestinationId ??
                        (x.Locality != null ? (int?)x.Locality.DestinationId :
                        (x.Object != null ? (int?)x.Object.DestinationId : null)),
                    DestinationName = x.Destination != null ? x.Destination.Name :
                        (x.Locality != null ? x.Locality.Destination.Name :
                        (x.Object != null ? x.Object.Destination.Name : null)),
                    RegionId = x.Destination != null ? (int?)x.Destination.RegionId :
                        (x.Locality != null ? (int?)x.Locality.Destination.RegionId :
                        (x.Object != null ? (int?)x.Object.Destination.RegionId : null)),
                    RegionName = x.Destination != null ? x.Destination.Region.Name :
                        (x.Locality != null ? x.Locality.Destination.Region.Name :
                        (x.Object != null ? x.Object.Destination.Region.Name : null)),
                    RegionCode = x.Destination != null ? x.Destination.Region.Code :
                        (x.Locality != null ? x.Locality.Destination.Region.Code :
                        (x.Object != null ? x.Object.Destination.Region.Code : null))
                })
                .ToListAsync();

            return objectRows
                .Concat(eventRows)
                .Concat(activityRows)
                .Where(x => x.DestinationId.HasValue)
                .ToList();
        }

        private async Task<ContentCreatorDashboardUpcomingEventsDto> LoadUpcomingEventsAsync(int creatorId, DateTime asOfUtc)
        {
            var next30Cutoff = asOfUtc.AddDays(30);
            var next7Cutoff = asOfUtc.AddDays(7);

            var rows = await _context.Events
                .AsNoTracking()
                .Where(x =>
                    x.CreatedByUserId == creatorId &&
                    x.Status == ContentStatus.Approved &&
                    x.IsActive &&
                    x.StartDate >= asOfUtc &&
                    x.StartDate <= next30Cutoff)
                .OrderBy(x => x.StartDate)
                .Select(x => new CreatorUpcomingEventRow
                {
                    EventId = x.Id,
                    EventName = x.Name,
                    StartDate = x.StartDate,
                    DestinationId = x.DestinationId ??
                        (x.Locality != null ? (int?)x.Locality.DestinationId :
                        (x.Object != null ? (int?)x.Object.DestinationId : null)),
                    DestinationName = x.Destination != null ? x.Destination.Name :
                        (x.Locality != null ? x.Locality.Destination.Name :
                        (x.Object != null ? x.Object.Destination.Name : null)),
                    RegionId = x.Destination != null ? (int?)x.Destination.RegionId :
                        (x.Locality != null ? (int?)x.Locality.Destination.RegionId :
                        (x.Object != null ? (int?)x.Object.Destination.RegionId : null)),
                    RegionName = x.Destination != null ? x.Destination.Region.Name :
                        (x.Locality != null ? x.Locality.Destination.Region.Name :
                        (x.Object != null ? x.Object.Destination.Region.Name : null)),
                    RegionCode = x.Destination != null ? x.Destination.Region.Code :
                        (x.Locality != null ? x.Locality.Destination.Region.Code :
                        (x.Object != null ? x.Object.Destination.Region.Code : null))
                })
                .ToListAsync();

            return new ContentCreatorDashboardUpcomingEventsDto
            {
                Next7Days = rows.Count(x => x.StartDate <= next7Cutoff),
                Next30Days = rows.Count,
                Items = rows
                    .Take(MaxUpcomingEvents)
                    .Select(x => new ContentCreatorDashboardUpcomingEventItemDto
                    {
                        EventId = x.EventId,
                        EventName = x.EventName,
                        StartDate = x.StartDate,
                        DestinationId = x.DestinationId,
                        DestinationName = x.DestinationName,
                        RegionId = x.RegionId,
                        RegionName = x.RegionName,
                        RegionCode = x.RegionCode
                    })
                    .ToList()
            };
        }

        private static ContentCreatorDashboardStatusBucketDto BuildStatusBucket(IReadOnlyList<StatusCountRow> rows)
        {
            return new ContentCreatorDashboardStatusBucketDto
            {
                Published = rows.Where(x => x.Status == ContentStatus.Approved).Sum(x => x.Count),
                Pending = rows.Where(x => x.Status == ContentStatus.Pending).Sum(x => x.Count),
                Rejected = rows.Where(x => x.Status == ContentStatus.Rejected).Sum(x => x.Count),
                Total = rows.Sum(x => x.Count)
            };
        }

        private static ContentCreatorDashboardStatusBucketDto SumBuckets(params ContentCreatorDashboardStatusBucketDto[] buckets)
        {
            return new ContentCreatorDashboardStatusBucketDto
            {
                Published = buckets.Sum(x => x.Published),
                Pending = buckets.Sum(x => x.Pending),
                Rejected = buckets.Sum(x => x.Rejected),
                Total = buckets.Sum(x => x.Total)
            };
        }

        private static List<ContentCreatorDashboardTrendPointDto> BuildEngagementTrend(
            DateTime periodStartUtc,
            DateTime asOfUtc,
            string granularity,
            IReadOnlyList<CreatorFavoriteRow> favoriteRows,
            IReadOnlyList<CreatorPlannerRow> plannerRows,
            IReadOnlyList<CreatorReviewRow> reviewRows)
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
                .Select(bucket => new ContentCreatorDashboardTrendPointDto
                {
                    Date = bucket,
                    Favorites = favoritesLookup.GetValueOrDefault(bucket),
                    PlannerAdds = plannerLookup.GetValueOrDefault(bucket),
                    Reviews = reviewLookup.GetValueOrDefault(bucket)
                })
                .ToList();
        }

        private static List<ContentCreatorDashboardTopContentItemDto> BuildTopContent(
            IReadOnlyList<CreatorFavoriteRow> favoriteRows,
            IReadOnlyList<CreatorPlannerRow> plannerRows,
            IReadOnlyList<CreatorReviewRow> reviewRows)
        {
            var favoriteLookup = favoriteRows
                .GroupBy(x => new { x.ContentType, x.ContentId })
                .ToDictionary(
                    g => (g.Key.ContentType, g.Key.ContentId),
                    g => new
                    {
                        Count = g.Count(),
                        Meta = g.First()
                    });

            var plannerLookup = plannerRows
                .GroupBy(x => x.ContentId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Count = g.Count(),
                        Meta = g.First()
                    });

            var reviewLookup = reviewRows
                .GroupBy(x => x.ContentId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Count = g.Count(),
                        AverageRating = Math.Round((decimal)g.Average(x => x.Rating), 1),
                        Meta = g.First()
                    });

            var keys = favoriteLookup.Keys
                .Select(x => (x.ContentType, x.ContentId))
                .Concat(plannerLookup.Keys.Select(x => ("Event", x)))
                .Concat(reviewLookup.Keys.Select(x => ("Object", x)))
                .Distinct()
                .ToList();

            return keys
                .Select(key =>
                {
                    var favoriteInfo = favoriteLookup.GetValueOrDefault(key);
                    var plannerInfo = key.Item1 == "Event"
                        ? plannerLookup.GetValueOrDefault(key.Item2)
                        : null;
                    var reviewInfo = key.Item1 == "Object"
                        ? reviewLookup.GetValueOrDefault(key.Item2)
                        : null;

                    var metaFavorite = favoriteInfo?.Meta;
                    var metaPlanner = plannerInfo?.Meta;
                    var metaReview = reviewInfo?.Meta;

                    var favoriteAdds = favoriteInfo?.Count ?? 0;
                    var plannerAdds = plannerInfo?.Count ?? 0;
                    var reviewCount = reviewInfo?.Count ?? 0;
                    var averageRating = reviewInfo?.AverageRating ?? 0m;
                    var engagementScore = favoriteAdds + (plannerAdds * 2) + (reviewCount * 3);

                    return new ContentCreatorDashboardTopContentItemDto
                    {
                        ContentType = key.Item1,
                        ContentId = key.Item2,
                        ContentName = metaFavorite?.ContentName ?? metaPlanner?.ContentName ?? metaReview?.ContentName ?? $"Content #{key.Item2}",
                        Status = (metaFavorite?.Status ?? metaPlanner?.Status ?? metaReview?.Status ?? ContentStatus.Pending).ToString(),
                        DestinationId = metaFavorite?.DestinationId ?? metaPlanner?.DestinationId ?? metaReview?.DestinationId,
                        DestinationName = metaFavorite?.DestinationName ?? metaPlanner?.DestinationName ?? metaReview?.DestinationName,
                        RegionId = metaFavorite?.RegionId ?? metaPlanner?.RegionId ?? metaReview?.RegionId,
                        RegionName = metaFavorite?.RegionName ?? metaPlanner?.RegionName ?? metaReview?.RegionName,
                        RegionCode = metaFavorite?.RegionCode ?? metaPlanner?.RegionCode ?? metaReview?.RegionCode,
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
                .ThenBy(x => x.ContentName)
                .Take(MaxTopContentItems)
                .ToList();
        }

        private static List<ContentCreatorDashboardTopDestinationItemDto> BuildTopDestinations(
            IReadOnlyList<CreatorContentLocationRow> contentLocations,
            IReadOnlyList<CreatorFavoriteRow> favoriteRows,
            IReadOnlyList<CreatorPlannerRow> plannerRows,
            IReadOnlyList<CreatorReviewRow> reviewRows)
        {
            var favoriteLookup = favoriteRows
                .Where(x => x.DestinationId.HasValue)
                .GroupBy(x => x.DestinationId!.Value)
                .ToDictionary(g => g.Key, g => g.Count());

            var plannerLookup = plannerRows
                .Where(x => x.DestinationId.HasValue)
                .GroupBy(x => x.DestinationId!.Value)
                .ToDictionary(g => g.Key, g => g.Count());

            var reviewLookup = reviewRows
                .GroupBy(x => x.DestinationId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Count = g.Count(),
                        AverageRating = Math.Round((decimal)g.Average(x => x.Rating), 1)
                    });

            var destinationRows = contentLocations
                .Where(x => x.DestinationId.HasValue)
                .GroupBy(x => new
                {
                    DestinationId = x.DestinationId!.Value,
                    DestinationName = x.DestinationName ?? "Unknown destination",
                    RegionId = x.RegionId ?? 0,
                    RegionName = x.RegionName ?? "Unknown region",
                    RegionCode = x.RegionCode ?? "N/A"
                })
                .Select(g =>
                {
                    var favoriteAdds = favoriteLookup.GetValueOrDefault(g.Key.DestinationId);
                    var plannerAdds = plannerLookup.GetValueOrDefault(g.Key.DestinationId);
                    var reviewInfo = reviewLookup.GetValueOrDefault(g.Key.DestinationId);
                    var reviewCount = reviewInfo?.Count ?? 0;
                    var averageRating = reviewInfo?.AverageRating ?? 0m;
                    var engagementScore = favoriteAdds + (plannerAdds * 2) + (reviewCount * 3);

                    return new ContentCreatorDashboardTopDestinationItemDto
                    {
                        DestinationId = g.Key.DestinationId,
                        DestinationName = g.Key.DestinationName,
                        RegionId = g.Key.RegionId,
                        RegionName = g.Key.RegionName,
                        RegionCode = g.Key.RegionCode,
                        ContentItems = g.Select(x => (x.ContentType, x.ContentId)).Distinct().Count(),
                        FavoriteAdds = favoriteAdds,
                        PlannerAdds = plannerAdds,
                        ReviewCount = reviewCount,
                        AverageRating = averageRating,
                        EngagementScore = engagementScore
                    };
                })
                .Where(x => x.ContentItems > 0)
                .OrderByDescending(x => x.EngagementScore)
                .ThenByDescending(x => x.AverageRating)
                .ThenByDescending(x => x.ContentItems)
                .ThenBy(x => x.DestinationName)
                .Take(MaxTopDestinations)
                .ToList();

            return destinationRows;
        }

        private static ContentCreatorDashboardRatingDistributionDto BuildRatingDistribution(IReadOnlyList<CreatorReviewRow> reviewRows)
        {
            return new ContentCreatorDashboardRatingDistributionDto
            {
                OneStar = reviewRows.Count(x => x.Rating == 1),
                TwoStars = reviewRows.Count(x => x.Rating == 2),
                ThreeStars = reviewRows.Count(x => x.Rating == 3),
                FourStars = reviewRows.Count(x => x.Rating == 4),
                FiveStars = reviewRows.Count(x => x.Rating == 5),
                TotalReviews = reviewRows.Count
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
    }
}
