using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class ManagerDashboardOverviewDto
    {
        public string PeriodKey { get; set; } = "30d";
        public int PeriodDays { get; set; }
        public string EngagementTrendGranularity { get; set; } = "day";
        public DateTime AsOfUtc { get; set; }
        public DateTime PeriodStartUtc { get; set; }
        public bool HasManagedDestination { get; set; }
        public ManagerDashboardDestinationDto? Destination { get; set; }
        public ManagerDashboardSummaryDto Summary { get; set; } = new();
        public ManagerDashboardModerationQueueDto ModerationQueue { get; set; } = new();
        public ManagerDashboardReportsDto Reports { get; set; } = new();
        public ManagerDashboardContentStatusDto ContentStatus { get; set; } = new();
        public List<ManagerDashboardTrendPointDto> EngagementTrend { get; set; } = new();
        public List<ManagerDashboardTopContentItemDto> TopContent { get; set; } = new();
        public List<ManagerDashboardTopCreatorItemDto> TopCreators { get; set; } = new();
        public List<ManagerDashboardLocalityPerformanceItemDto> LocalityPerformance { get; set; } = new();
        public ManagerDashboardUpcomingEventsDto UpcomingEvents { get; set; } = new();
    }

    public class ManagerDashboardDestinationDto
    {
        public int DestinationId { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public string? DisplayTitle { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public string RegionCode { get; set; } = string.Empty;
        public int LocalityCount { get; set; }
    }

    public class ManagerDashboardSummaryDto
    {
        public int ActiveCreators { get; set; }
        public int ActiveObjects { get; set; }
        public int ActiveEvents { get; set; }
        public int ActiveActivities { get; set; }
        public int PendingModerationItems { get; set; }
        public int OpenReports { get; set; }
        public int FavoritesInPeriod { get; set; }
        public int PlannerAddsInPeriod { get; set; }
        public int NewReviewsInPeriod { get; set; }
        public int UnansweredReviews { get; set; }
        public int LowRatedReviewsInPeriod { get; set; }
        public decimal AverageRatingInPeriod { get; set; }
        public int UpcomingEventsInNext30Days { get; set; }
    }

    public class ManagerDashboardModerationQueueDto
    {
        public int PendingObjects { get; set; }
        public int PendingEvents { get; set; }
        public int PendingActivities { get; set; }
        public int PendingDeletionRequests { get; set; }
        public int TotalPending { get; set; }
    }

    public class ManagerDashboardReportsDto
    {
        public int CurrentPending { get; set; }
        public int SubmittedInPeriod { get; set; }
        public int ApprovedInPeriod { get; set; }
        public int RejectedInPeriod { get; set; }
        public int TotalInPeriod { get; set; }
    }

    public class ManagerDashboardContentStatusDto
    {
        public ManagerDashboardStatusBucketDto Overall { get; set; } = new();
        public ManagerDashboardStatusBucketDto Objects { get; set; } = new();
        public ManagerDashboardStatusBucketDto Events { get; set; } = new();
        public ManagerDashboardStatusBucketDto Activities { get; set; } = new();
    }

    public class ManagerDashboardStatusBucketDto
    {
        public int Total { get; set; }
        public int Published { get; set; }
        public int Pending { get; set; }
        public int Rejected { get; set; }
    }

    public class ManagerDashboardTrendPointDto
    {
        public DateTime Date { get; set; }
        public int Favorites { get; set; }
        public int PlannerAdds { get; set; }
        public int Reviews { get; set; }
    }

    public class ManagerDashboardTopContentItemDto
    {
        public string ContentType { get; set; } = string.Empty;
        public int ContentId { get; set; }
        public string ContentName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int CreatorId { get; set; }
        public string CreatorName { get; set; } = string.Empty;
        public string CreatorEmail { get; set; } = string.Empty;
        public int? LocalityId { get; set; }
        public string? LocalityName { get; set; }
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public decimal AverageRating { get; set; }
        public int EngagementScore { get; set; }
    }

    public class ManagerDashboardTopCreatorItemDto
    {
        public int CreatorId { get; set; }
        public string CreatorName { get; set; } = string.Empty;
        public string CreatorEmail { get; set; } = string.Empty;
        public int ContentItems { get; set; }
        public int PublishedItems { get; set; }
        public int PendingItems { get; set; }
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public decimal AverageRating { get; set; }
        public int EngagementScore { get; set; }
    }

    public class ManagerDashboardLocalityPerformanceItemDto
    {
        public int? LocalityId { get; set; }
        public string LocalityName { get; set; } = string.Empty;
        public int ContentItems { get; set; }
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public decimal AverageRating { get; set; }
        public int EngagementScore { get; set; }
    }

    public class ManagerDashboardUpcomingEventsDto
    {
        public int Next7Days { get; set; }
        public int Next30Days { get; set; }
        public List<ManagerDashboardUpcomingEventItemDto> Items { get; set; } = new();
    }

    public class ManagerDashboardUpcomingEventItemDto
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
}
