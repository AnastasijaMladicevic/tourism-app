using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class ContentCreatorDashboardOverviewDto
    {
        public string PeriodKey { get; set; } = "30d";
        public int PeriodDays { get; set; }
        public string EngagementTrendGranularity { get; set; } = "day";
        public DateTime AsOfUtc { get; set; }
        public DateTime PeriodStartUtc { get; set; }
        public ContentCreatorDashboardSummaryDto Summary { get; set; } = new();
        public ContentCreatorDashboardContentStatusDto ContentStatus { get; set; } = new();
        public List<ContentCreatorDashboardTrendPointDto> EngagementTrend { get; set; } = new();
        public List<ContentCreatorDashboardTopContentItemDto> TopContent { get; set; } = new();
        public List<ContentCreatorDashboardTopDestinationItemDto> TopDestinations { get; set; } = new();
        public ContentCreatorDashboardRatingDistributionDto RatingDistribution { get; set; } = new();
        public ContentCreatorDashboardUpcomingEventsDto UpcomingEvents { get; set; } = new();
    }

    public class ContentCreatorDashboardSummaryDto
    {
        public int TotalContent { get; set; }
        public int PublishedContent { get; set; }
        public int PendingContent { get; set; }
        public int RejectedContent { get; set; }
        public int FavoritesInPeriod { get; set; }
        public int PlannerAddsInPeriod { get; set; }
        public int NewReviewsInPeriod { get; set; }
        public int UnansweredReviews { get; set; }
        public decimal AverageRatingInPeriod { get; set; }
        public int UpcomingEventsInNext30Days { get; set; }
    }

    public class ContentCreatorDashboardContentStatusDto
    {
        public ContentCreatorDashboardStatusBucketDto Overall { get; set; } = new();
        public ContentCreatorDashboardStatusBucketDto Objects { get; set; } = new();
        public ContentCreatorDashboardStatusBucketDto Events { get; set; } = new();
        public ContentCreatorDashboardStatusBucketDto Activities { get; set; } = new();
    }

    public class ContentCreatorDashboardStatusBucketDto
    {
        public int Total { get; set; }
        public int Published { get; set; }
        public int Pending { get; set; }
        public int Rejected { get; set; }
    }

    public class ContentCreatorDashboardTrendPointDto
    {
        public DateTime Date { get; set; }
        public int Favorites { get; set; }
        public int PlannerAdds { get; set; }
        public int Reviews { get; set; }
    }

    public class ContentCreatorDashboardTopContentItemDto
    {
        public string ContentType { get; set; } = string.Empty;
        public int ContentId { get; set; }
        public string ContentName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? DestinationId { get; set; }
        public string? DestinationName { get; set; }
        public int? RegionId { get; set; }
        public string? RegionName { get; set; }
        public string? RegionCode { get; set; }
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public decimal AverageRating { get; set; }
        public int EngagementScore { get; set; }
    }

    public class ContentCreatorDashboardTopDestinationItemDto
    {
        public int DestinationId { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public string RegionCode { get; set; } = string.Empty;
        public int ContentItems { get; set; }
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public decimal AverageRating { get; set; }
        public int EngagementScore { get; set; }
    }

    public class ContentCreatorDashboardRatingDistributionDto
    {
        public int OneStar { get; set; }
        public int TwoStars { get; set; }
        public int ThreeStars { get; set; }
        public int FourStars { get; set; }
        public int FiveStars { get; set; }
        public int TotalReviews { get; set; }
    }

    public class ContentCreatorDashboardUpcomingEventsDto
    {
        public int Next7Days { get; set; }
        public int Next30Days { get; set; }
        public List<ContentCreatorDashboardUpcomingEventItemDto> Items { get; set; } = new();
    }

    public class ContentCreatorDashboardUpcomingEventItemDto
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
}
