using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using TuristickiVodic.Core.DTO;
using TuristickiVodic.Core.Models;
using TuristickiVodic.Infrastructure.Data;

namespace TuristickiVodic.Services.Services
{
    public class RecommendationService : IRecommendationService
    {
        private readonly AppDbContext _context;

        public RecommendationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<RecommendationItemDto>> GetHomeRecommendationsAsync(int? userId, HomeRecommendationQueryDto query)
        {
            var pageSize = Math.Clamp(query.PageSize <= 0 ? 12 : query.PageSize, 1, 24);
            var context = await BuildContextAsync(userId, query);

            var destinationQuery = _context.Destinations
                .AsNoTracking()
                .Include(d => d.Region)
                .Include(d => d.DestinationType)
                .Include(d => d.Images)
                .Where(d => d.IsActive)
                .Where(d => d.Status == ContentStatus.Approved)
                .Where(d => d.Images.Any(i => i.IsMain))
                .AsQueryable();

            var objectQuery = _context.Objects
                .AsNoTracking()
                .Include(o => o.ObjectType)
                .Include(o => o.Destination)
                    .ThenInclude(d => d.Region)
                .Include(o => o.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(o => o.Images)
                .Where(o => o.IsActive)
                .Where(o => o.Status == ContentStatus.Approved)
                .Where(o => o.Images.Any(i => i.IsMain))
                .AsQueryable();

            var activityQuery = _context.Activities
                .AsNoTracking()
                .Include(a => a.ActivityType)
                .Include(a => a.Object)
                    .ThenInclude(o => o.ObjectType)
                .Include(a => a.Destination)
                    .ThenInclude(d => d.Region)
                .Include(a => a.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(a => a.Images)
                .Where(a => a.IsActive)
                .Where(a => a.Status == ContentStatus.Approved)
                .Where(a => a.Images.Any(i => i.IsMain))
                .AsQueryable();

            var eventQuery = _context.Events
                .AsNoTracking()
                .Include(e => e.EventType)
                .Include(e => e.Destination)
                    .ThenInclude(d => d.Region)
                .Include(e => e.Locality)
                    .ThenInclude(l => l.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                    .ThenInclude(o => o.Destination)
                        .ThenInclude(d => d.Region)
                .Include(e => e.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                            .ThenInclude(d => d.Region)
                .Include(e => e.Images)
                .Where(e => e.IsActive)
                .Where(e => e.Status == ContentStatus.Approved)
                .Where(e => e.Images.Any(i => i.IsMain))
                .Where(e => (e.EndDate ?? e.StartDate) >= DateTime.UtcNow)
                .AsQueryable();

            if (context.EffectiveRegionId.HasValue)
            {
                var regionId = context.EffectiveRegionId.Value;
                destinationQuery = destinationQuery.Where(d => d.RegionId == regionId);
                objectQuery = objectQuery.Where(o =>
                    o.Destination.RegionId == regionId ||
                    (o.Locality != null && o.Locality.Destination != null && o.Locality.Destination.RegionId == regionId));
                activityQuery = activityQuery.Where(a =>
                    (a.Destination != null && a.Destination.RegionId == regionId) ||
                    (a.Destination == null && a.Locality != null && a.Locality.Destination != null && a.Locality.Destination.RegionId == regionId));
                eventQuery = eventQuery.Where(e =>
                    (e.Destination != null && e.Destination.RegionId == regionId) ||
                    (e.Destination == null && e.Locality != null && e.Locality.Destination != null && e.Locality.Destination.RegionId == regionId) ||
                    (e.Destination == null &&
                     e.Locality == null &&
                     e.Object != null &&
                     ((e.Object.Destination != null && e.Object.Destination.RegionId == regionId) ||
                      (e.Object.Locality != null &&
                       e.Object.Locality.Destination != null &&
                       e.Object.Locality.Destination.RegionId == regionId))));
            }

            var destinations = await destinationQuery.ToListAsync();
            var objects = await objectQuery.ToListAsync();
            var activities = await activityQuery.ToListAsync();
            var events = await eventQuery.ToListAsync();

            var destinationFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.DestinationId.HasValue)
                .GroupBy(f => f.DestinationId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var objectFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.ObjectId.HasValue)
                .GroupBy(f => f.ObjectId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var activityFavoriteCounts = await _context.Favorites.AsNoTracking()
                .Where(f => f.ActivityId.HasValue)
                .GroupBy(f => f.ActivityId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var candidates = new List<RecommendationCandidate>();

            foreach (var destination in destinations)
            {
                var distanceMeters = CalculateDistanceFromContext(context.Origin, destination.Geolocation);
                var favoriteCount = destinationFavoriteCounts.GetValueOrDefault(destination.Id);
                var score = 22d
                    + favoriteCount * 6d
                    + RegionBoost(context, destination.RegionId, 20d)
                    + FavoriteDestinationBoost(context, destination.Id, 18d)
                    + FavoriteRegionBoost(context, destination.RegionId, 8d)
                    + ReviewedDestinationBoost(context, destination.Id, 8d)
                    + DistanceBoost(distanceMeters, 180_000d, 24d);

                candidates.Add(new RecommendationCandidate
                {
                    ItemType = "destination",
                    ItemId = destination.Id,
                    Title = destination.Name,
                    Location = destination.Region?.Name ?? string.Empty,
                    CategoryName = destination.DestinationType?.Name ?? string.Empty,
                    ImageUrl = GetMainImageUrl(destination.Images),
                    AverageRating = null,
                    ReviewCount = 0,
                    Price = null,
                    DurationMinutes = null,
                    DistanceMeters = distanceMeters,
                    Score = score,
                    DestinationId = destination.Id,
                    RegionId = destination.RegionId,
                    GlobalFavoriteCount = favoriteCount,
                });
            }

            foreach (var obj in objects)
            {
                var destinationId = ResolveObjectDestinationId(obj);
                var regionId = ResolveObjectRegionId(obj);
                var distanceMeters = CalculateDistanceFromContext(context.Origin, obj.Geolocation);
                var favoriteCount = objectFavoriteCounts.GetValueOrDefault(obj.Id);
                double? typePreference = context.ObjectTypeAverageRatings.TryGetValue(obj.ObjectTypeId, out var objectTypeAverage)
                    ? objectTypeAverage
                    : null;
                var score = 30d
                    + (double)obj.AverageRating * 12d
                    + Math.Log(obj.ReviewCount + 1, 2) * 6d
                    + favoriteCount * 5d
                    + RegionBoost(context, regionId, 18d)
                    + FavoriteDestinationBoost(context, destinationId, 12d)
                    + FavoriteRegionBoost(context, regionId, 6d)
                    + FavoriteObjectBoost(context, obj.Id, 16d)
                    + FavoriteObjectTypeBoost(context, obj.ObjectTypeId, 14d)
                    + ReviewedDestinationBoost(context, destinationId, 6d)
                    + ReviewedObjectTypeBoost(typePreference, 16d)
                    + DistanceBoost(distanceMeters, 90_000d, 34d);

                candidates.Add(new RecommendationCandidate
                {
                    ItemType = "object",
                    ItemId = obj.Id,
                    Title = obj.Name,
                    Location = ResolveObjectLocation(obj),
                    CategoryName = obj.ObjectType?.Name ?? string.Empty,
                    ImageUrl = GetMainImageUrl(obj.Images),
                    AverageRating = obj.AverageRating,
                    ReviewCount = obj.ReviewCount,
                    Price = obj.Price,
                    DurationMinutes = null,
                    DistanceMeters = distanceMeters,
                    Score = score,
                    DestinationId = destinationId,
                    RegionId = regionId,
                    ObjectTypeId = obj.ObjectTypeId,
                    GlobalFavoriteCount = favoriteCount,
                });
            }

            foreach (var activity in activities)
            {
                var destinationId = ResolveActivityDestinationId(activity);
                var regionId = ResolveActivityRegionId(activity);
                var distanceMeters = CalculateDistanceFromContext(context.Origin, activity.Geolocation);
                var favoriteCount = activityFavoriteCounts.GetValueOrDefault(activity.Id);
                double? linkedObjectTypePreference =
                    activity.Object != null &&
                    context.ObjectTypeAverageRatings.TryGetValue(activity.Object.ObjectTypeId, out var linkedTypeAverage)
                        ? linkedTypeAverage
                        : null;

                var score = 24d
                    + favoriteCount * 6d
                    + RegionBoost(context, regionId, 18d)
                    + FavoriteDestinationBoost(context, destinationId, 10d)
                    + FavoriteRegionBoost(context, regionId, 6d)
                    + FavoriteActivityBoost(context, activity.Id, 14d)
                    + FavoriteActivityTypeBoost(context, activity.ActivityTypeId, 14d)
                    + ReviewedDestinationBoost(context, destinationId, 6d)
                    + ReviewedObjectTypeBoost(linkedObjectTypePreference, 8d)
                    + DistanceBoost(distanceMeters, 90_000d, 30d);

                candidates.Add(new RecommendationCandidate
                {
                    ItemType = "activity",
                    ItemId = activity.Id,
                    Title = activity.Name,
                    Location = ResolveActivityLocation(activity),
                    CategoryName = activity.ActivityType?.Name ?? string.Empty,
                    ImageUrl = GetMainImageUrl(activity.Images),
                    AverageRating = null,
                    ReviewCount = 0,
                    Price = activity.Price,
                    DurationMinutes = activity.DurationMinutes,
                    DistanceMeters = distanceMeters,
                    Score = score,
                    DestinationId = destinationId,
                    RegionId = regionId,
                    ActivityTypeId = activity.ActivityTypeId,
                    GlobalFavoriteCount = favoriteCount,
                });
            }

            foreach (var eventItem in events)
            {
                var destinationId = ResolveEventDestinationId(eventItem);
                var regionId = ResolveEventRegionId(eventItem);
                var point = ResolveEventPoint(eventItem);
                var distanceMeters = CalculateDistanceFromContext(context.Origin, point);
                var durationMinutes = eventItem.EndDate.HasValue
                        ? (int?)Math.Max(0, (int)Math.Round((eventItem.EndDate.Value - eventItem.StartDate).TotalMinutes))
                        : null;

                var score = 26d
                    + RegionBoost(context, regionId, 18d)
                    + FavoriteDestinationBoost(context, destinationId, 10d)
                    + FavoriteRegionBoost(context, regionId, 6d)
                    + ReviewedDestinationBoost(context, destinationId, 6d)
                    + DistanceBoost(distanceMeters, 120_000d, 24d)
                    + UpcomingEventBoost(eventItem.StartDate, eventItem.EndDate, 18d);

                candidates.Add(new RecommendationCandidate
                {
                    ItemType = "event",
                    ItemId = eventItem.Id,
                    Title = eventItem.Name,
                    Location = ResolveEventLocation(eventItem),
                    CategoryName = eventItem.EventType?.Name ?? string.Empty,
                    ImageUrl = GetMainImageUrl(eventItem.Images),
                    AverageRating = null,
                    ReviewCount = 0,
                    Price = eventItem.Price,
                    DurationMinutes = durationMinutes,
                    DistanceMeters = distanceMeters,
                    Score = score,
                    DestinationId = destinationId,
                    RegionId = regionId,
                    GlobalFavoriteCount = 0,
                });
            }

            var ordered = candidates
                .OrderByDescending(c => c.Score)
                .ThenByDescending(c => c.GlobalFavoriteCount)
                .ThenByDescending(c => c.AverageRating ?? 0)
                .ThenByDescending(c => c.ReviewCount)
                .ThenBy(c => c.Title)
                .ToList();

            return Diversify(ordered, pageSize)
                .Select(c => new RecommendationItemDto
                {
                    ItemType = c.ItemType,
                    ItemId = c.ItemId,
                    Title = c.Title,
                    Location = c.Location,
                    CategoryName = c.CategoryName,
                    ImageUrl = c.ImageUrl,
                    AverageRating = c.AverageRating,
                    ReviewCount = c.ReviewCount,
                    Price = c.Price,
                    DurationMinutes = c.DurationMinutes,
                    DistanceMeters = c.DistanceMeters.HasValue ? Math.Round(c.DistanceMeters.Value, 2) : null,
                    Score = Math.Round(c.Score, 2),
                })
                .ToList();
        }

        private async Task<RecommendationContext> BuildContextAsync(int? userId, HomeRecommendationQueryDto query)
        {
            var context = new RecommendationContext
            {
                EffectiveRegionId = query.RegionId,
            };

            User? user = null;
            if (userId.HasValue)
            {
                user = await _context.Users
                    .AsNoTracking()
                    .Include(u => u.PreferredRegion)
                    .FirstOrDefaultAsync(u => u.Id == userId.Value);
            }

            context.EffectiveRegionId ??= user?.PreferredRegionId;

            if (query.Latitude.HasValue && query.Longitude.HasValue)
            {
                context.Origin = new GeoPoint(query.Latitude.Value, query.Longitude.Value);
            }
            else if (user?.LastKnownLocation != null)
            {
                context.Origin = new GeoPoint(user.LastKnownLocation.Y, user.LastKnownLocation.X);
            }
            else if (context.EffectiveRegionId.HasValue)
            {
                var region = user?.PreferredRegionId == context.EffectiveRegionId
                    ? user?.PreferredRegion
                    : await _context.Regions.AsNoTracking().FirstOrDefaultAsync(r => r.Id == context.EffectiveRegionId.Value);

                if (region?.CenterLatitude != null && region.CenterLongitude != null)
                {
                    context.Origin = new GeoPoint(region.CenterLatitude.Value, region.CenterLongitude.Value);
                }
            }

            if (!userId.HasValue)
            {
                return context;
            }

            var userFavorites = await _context.Favorites
                .AsNoTracking()
                .Include(f => f.Object)
                    .ThenInclude(o => o.Destination)
                .Include(f => f.Activity)
                    .ThenInclude(a => a.Destination)
                .Include(f => f.Activity)
                    .ThenInclude(a => a.Locality)
                        .ThenInclude(l => l.Destination)
                .Include(f => f.Destination)
                .Where(f => f.UserId == userId.Value)
                .ToListAsync();

            foreach (var favorite in userFavorites)
            {
                if (favorite.DestinationId.HasValue)
                {
                    AddWeight(context.FavoriteDestinationWeights, favorite.DestinationId.Value);
                    context.FavoriteDestinationIds.Add(favorite.DestinationId.Value);
                    if (favorite.Destination?.RegionId != null)
                    {
                        AddWeight(context.FavoriteRegionWeights, favorite.Destination.RegionId);
                    }
                }

                if (favorite.ObjectId.HasValue && favorite.Object != null)
                {
                    context.FavoriteObjectIds.Add(favorite.ObjectId.Value);
                    AddWeight(context.FavoriteObjectTypeWeights, favorite.Object.ObjectTypeId);

                    var destinationId = ResolveObjectDestinationId(favorite.Object);
                    if (destinationId > 0)
                    {
                        AddWeight(context.FavoriteDestinationWeights, destinationId);
                    }

                    var regionId = ResolveObjectRegionId(favorite.Object);
                    if (regionId.HasValue)
                    {
                        AddWeight(context.FavoriteRegionWeights, regionId.Value);
                    }
                }

                if (favorite.ActivityId.HasValue && favorite.Activity != null)
                {
                    context.FavoriteActivityIds.Add(favorite.ActivityId.Value);
                    AddWeight(context.FavoriteActivityTypeWeights, favorite.Activity.ActivityTypeId);

                    var destinationId = ResolveActivityDestinationId(favorite.Activity);
                    var regionId = ResolveActivityRegionId(favorite.Activity);
                    if (destinationId.HasValue)
                    {
                        AddWeight(context.FavoriteDestinationWeights, destinationId.Value);
                    }

                    if (regionId.HasValue)
                    {
                        AddWeight(context.FavoriteRegionWeights, regionId.Value);
                    }
                }
            }

            var userReviews = await _context.Reviews
                .AsNoTracking()
                .Include(r => r.Object)
                    .ThenInclude(o => o.ObjectType)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Destination)
                .Include(r => r.Object)
                    .ThenInclude(o => o.Locality)
                        .ThenInclude(l => l.Destination)
                .Where(r => r.UserId == userId.Value)
                .Where(r => r.Status == ContentStatus.Approved)
                .ToListAsync();

            context.ObjectTypeAverageRatings = userReviews
                .Where(r => r.Object != null)
                .GroupBy(r => r.Object.ObjectTypeId)
                .ToDictionary(g => g.Key, g => g.Average(r => (double)r.Rating));

            context.DestinationAverageRatings = userReviews
                .Where(r => ResolveReviewDestinationId(r).HasValue)
                .GroupBy(r => ResolveReviewDestinationId(r)!.Value)
                .ToDictionary(g => g.Key, g => g.Average(r => (double)r.Rating));

            return context;
        }

        private static List<RecommendationCandidate> Diversify(List<RecommendationCandidate> ordered, int pageSize)
        {
            var caps = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["object"] = Math.Max(4, pageSize / 2),
                ["destination"] = Math.Max(3, (int)Math.Ceiling(pageSize / 3d)),
                ["activity"] = Math.Max(3, (int)Math.Ceiling(pageSize / 3d)),
                ["event"] = Math.Max(3, (int)Math.Ceiling(pageSize / 3d)),
            };

            var selected = new List<RecommendationCandidate>();
            var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var candidate in ordered)
            {
                var current = counts.GetValueOrDefault(candidate.ItemType);
                var cap = caps.GetValueOrDefault(candidate.ItemType, pageSize);
                if (current >= cap)
                {
                    continue;
                }

                selected.Add(candidate);
                counts[candidate.ItemType] = current + 1;

                if (selected.Count >= pageSize)
                {
                    return selected;
                }
            }

            foreach (var candidate in ordered)
            {
                if (selected.Any(x => x.ItemType == candidate.ItemType && x.ItemId == candidate.ItemId))
                {
                    continue;
                }

                selected.Add(candidate);
                if (selected.Count >= pageSize)
                {
                    break;
                }
            }

            return selected;
        }

        private static string? GetMainImageUrl(IEnumerable<Image>? images)
        {
            return images?
                .OrderByDescending(i => i.IsMain)
                .Select(i => i.Url)
                .FirstOrDefault();
        }

        private static string ResolveObjectLocation(TouristObject obj)
        {
            return obj.Locality?.Name
                ?? obj.Destination?.Name
                ?? obj.Destination?.Region?.Name
                ?? obj.ObjectType?.Name
                ?? string.Empty;
        }

        private static string ResolveActivityLocation(Activity activity)
        {
            return activity.Locality?.Name
                ?? activity.Destination?.Name
                ?? activity.Destination?.Region?.Name
                ?? activity.ActivityType?.Name
                ?? string.Empty;
        }

        private static string ResolveEventLocation(Event eventItem)
        {
            return eventItem.Locality?.Name
                ?? eventItem.Destination?.Name
                ?? eventItem.Object?.Locality?.Name
                ?? eventItem.Object?.Destination?.Name
                ?? eventItem.Destination?.Region?.Name
                ?? eventItem.EventType?.Name
                ?? string.Empty;
        }

        private static int ResolveObjectDestinationId(TouristObject obj)
        {
            return obj.DestinationId != 0
                ? obj.DestinationId
                : obj.Locality?.DestinationId ?? 0;
        }

        private static int? ResolveObjectRegionId(TouristObject obj)
        {
            return obj.Destination?.RegionId
                ?? obj.Locality?.Destination?.RegionId;
        }

        private static int? ResolveActivityDestinationId(Activity activity)
        {
            return activity.DestinationId
                ?? activity.Locality?.DestinationId;
        }

        private static int? ResolveActivityRegionId(Activity activity)
        {
            return activity.Destination?.RegionId
                ?? activity.Locality?.Destination?.RegionId;
        }

        private static int? ResolveEventDestinationId(Event eventItem)
        {
            return eventItem.DestinationId
                ?? eventItem.Locality?.DestinationId
                ?? eventItem.Object?.DestinationId
                ?? eventItem.Object?.Locality?.DestinationId;
        }

        private static int? ResolveEventRegionId(Event eventItem)
        {
            return eventItem.Destination?.RegionId
                ?? eventItem.Locality?.Destination?.RegionId
                ?? eventItem.Object?.Destination?.RegionId
                ?? eventItem.Object?.Locality?.Destination?.RegionId;
        }

        private static Point? ResolveEventPoint(Event eventItem)
        {
            return eventItem.Geolocation
                ?? eventItem.Object?.Geolocation
                ?? eventItem.Locality?.Geolocation
                ?? eventItem.Destination?.Geolocation;
        }

        private static int? ResolveReviewDestinationId(Review review)
        {
            return review.Object?.DestinationId
                ?? review.Object?.Locality?.DestinationId;
        }

        private static void AddWeight(Dictionary<int, int> weights, int id)
        {
            weights[id] = weights.GetValueOrDefault(id) + 1;
        }

        private static double RegionBoost(RecommendationContext context, int? regionId, double weight)
        {
            return context.EffectiveRegionId.HasValue && regionId == context.EffectiveRegionId.Value
                ? weight
                : 0d;
        }

        private static double FavoriteRegionBoost(RecommendationContext context, int? regionId, double weightPerFavorite)
        {
            return regionId.HasValue && context.FavoriteRegionWeights.TryGetValue(regionId.Value, out var count)
                ? Math.Min(weightPerFavorite * count, weightPerFavorite * 2.5d)
                : 0d;
        }

        private static double FavoriteDestinationBoost(RecommendationContext context, int? destinationId, double weightPerFavorite)
        {
            return destinationId.HasValue && context.FavoriteDestinationWeights.TryGetValue(destinationId.Value, out var count)
                ? Math.Min(weightPerFavorite * count, weightPerFavorite * 2.5d)
                : 0d;
        }

        private static double FavoriteObjectBoost(RecommendationContext context, int objectId, double weight)
        {
            return context.FavoriteObjectIds.Contains(objectId) ? weight : 0d;
        }

        private static double FavoriteActivityBoost(RecommendationContext context, int activityId, double weight)
        {
            return context.FavoriteActivityIds.Contains(activityId) ? weight : 0d;
        }

        private static double FavoriteObjectTypeBoost(RecommendationContext context, int objectTypeId, double weightPerFavorite)
        {
            return context.FavoriteObjectTypeWeights.TryGetValue(objectTypeId, out var count)
                ? Math.Min(weightPerFavorite * count, weightPerFavorite * 2.5d)
                : 0d;
        }

        private static double FavoriteActivityTypeBoost(RecommendationContext context, int activityTypeId, double weightPerFavorite)
        {
            return context.FavoriteActivityTypeWeights.TryGetValue(activityTypeId, out var count)
                ? Math.Min(weightPerFavorite * count, weightPerFavorite * 2.5d)
                : 0d;
        }

        private static double ReviewedDestinationBoost(RecommendationContext context, int? destinationId, double weight)
        {
            if (!destinationId.HasValue || !context.DestinationAverageRatings.TryGetValue(destinationId.Value, out var rating))
            {
                return 0d;
            }

            return (rating - 3d) * weight;
        }

        private static double ReviewedObjectTypeBoost(double? averageRating, double weight)
        {
            return averageRating.HasValue
                ? (averageRating.Value - 3d) * weight
                : 0d;
        }

        private static double DistanceBoost(double? distanceMeters, double maxDistanceMeters, double maxBoost)
        {
            if (!distanceMeters.HasValue)
            {
                return 0d;
            }

            var normalized = 1d - Math.Min(distanceMeters.Value, maxDistanceMeters) / maxDistanceMeters;
            return Math.Max(0d, normalized * maxBoost);
        }

        private static double UpcomingEventBoost(DateTime startDate, DateTime? endDate, double maxBoost)
        {
            var now = DateTime.UtcNow;
            var effectiveEnd = endDate ?? startDate;
            if (effectiveEnd < now)
            {
                return 0d;
            }

            var daysUntilStart = Math.Max(0d, (startDate - now).TotalDays);
            const double boostWindowDays = 21d;
            var normalized = 1d - Math.Min(daysUntilStart, boostWindowDays) / boostWindowDays;
            return Math.Max(0d, normalized * maxBoost);
        }

        private static double? CalculateDistanceFromContext(GeoPoint? origin, Point? point)
        {
            if (origin == null || point == null)
            {
                return null;
            }

            return CalculateDistanceMeters(origin.Latitude, origin.Longitude, point.Y, point.X);
        }

        private static double CalculateDistanceMeters(double latitude1, double longitude1, double latitude2, double longitude2)
        {
            const double earthRadiusMeters = 6371000d;

            var deltaLatitude = DegreesToRadians(latitude2 - latitude1);
            var deltaLongitude = DegreesToRadians(longitude2 - longitude1);
            var normalizedLatitude1 = DegreesToRadians(latitude1);
            var normalizedLatitude2 = DegreesToRadians(latitude2);

            var a =
                Math.Sin(deltaLatitude / 2) * Math.Sin(deltaLatitude / 2) +
                Math.Cos(normalizedLatitude1) * Math.Cos(normalizedLatitude2) *
                Math.Sin(deltaLongitude / 2) * Math.Sin(deltaLongitude / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusMeters * c;
        }

        private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

        private sealed class RecommendationContext
        {
            public int? EffectiveRegionId { get; set; }
            public GeoPoint? Origin { get; set; }
            public Dictionary<int, int> FavoriteDestinationWeights { get; set; } = new();
            public Dictionary<int, int> FavoriteRegionWeights { get; set; } = new();
            public HashSet<int> FavoriteDestinationIds { get; set; } = new();
            public HashSet<int> FavoriteObjectIds { get; set; } = new();
            public HashSet<int> FavoriteActivityIds { get; set; } = new();
            public Dictionary<int, int> FavoriteObjectTypeWeights { get; set; } = new();
            public Dictionary<int, int> FavoriteActivityTypeWeights { get; set; } = new();
            public Dictionary<int, double> ObjectTypeAverageRatings { get; set; } = new();
            public Dictionary<int, double> DestinationAverageRatings { get; set; } = new();
        }

        private sealed class RecommendationCandidate
        {
            public string ItemType { get; set; } = string.Empty;
            public int ItemId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public string CategoryName { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public decimal? AverageRating { get; set; }
            public int ReviewCount { get; set; }
            public decimal? Price { get; set; }
            public int? DurationMinutes { get; set; }
            public double? DistanceMeters { get; set; }
            public double Score { get; set; }
            public int? DestinationId { get; set; }
            public int? RegionId { get; set; }
            public int? ObjectTypeId { get; set; }
            public int? ActivityTypeId { get; set; }
            public int GlobalFavoriteCount { get; set; }
        }

        private sealed record GeoPoint(double Latitude, double Longitude);
    }
}
