using System;
using System.Collections.Generic;

namespace TuristickiVodic.Core.DTO
{
    public class AdminDashboardOverviewDto
    {
        public string PeriodKey { get; set; } = "30d";
        public int PeriodDays { get; set; }
        public string UserGrowthGranularity { get; set; } = "day";
        public DateTime AsOfUtc { get; set; }
        public DateTime PeriodStartUtc { get; set; }
        public AdminDashboardSummaryDto Summary { get; set; } = new();
        public List<AdminDashboardUserGrowthPointDto> UserGrowth { get; set; } = new();
        public List<AdminDashboardRoleDistributionItemDto> RoleDistribution { get; set; } = new();
        public List<AdminDashboardDestinationByRegionDto> DestinationsByRegion { get; set; } = new();
        public AdminDashboardCreatorRequestStatusDto CreatorRequests { get; set; } = new();
        public AdminDashboardReportsSummaryDto Reports { get; set; } = new();
        public AdminDashboardAccountHealthDto AccountHealth { get; set; } = new();
        public AdminDashboardDestinationEngagementDto DestinationEngagement { get; set; } = new();
        public AdminDashboardGeospatialOverviewDto GeospatialOverview { get; set; } = new();
    }

    public class AdminDashboardSummaryDto
    {
        public int TotalTourists { get; set; }
        public int NewTouristsInPeriod { get; set; }
        public int ActiveDestinations { get; set; }
        public int NewDestinationsInPeriod { get; set; }
        public int PendingCreatorRequests { get; set; }
        public int OpenReports { get; set; }
    }

    public class AdminDashboardUserGrowthPointDto
    {
        public DateTime Date { get; set; }
        public int Tourists { get; set; }
        public int ContentCreators { get; set; }
        public int Managers { get; set; }
        public int Admins { get; set; }
    }

    public class AdminDashboardRoleDistributionItemDto
    {
        public string Role { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class AdminDashboardDestinationByRegionDto
    {
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public string RegionCode { get; set; } = string.Empty;
        public int TotalDestinations { get; set; }
        public int ActiveDestinations { get; set; }
        public int GeocodedDestinations { get; set; }
    }

    public class AdminDashboardCreatorRequestStatusDto
    {
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int None { get; set; }
        public int TotalSubmitted { get; set; }
    }

    public class AdminDashboardReportsSummaryDto
    {
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int Total { get; set; }
    }

    public class AdminDashboardAccountHealthDto
    {
        public int Verified { get; set; }
        public int Unverified { get; set; }
        public int Active { get; set; }
        public int Inactive { get; set; }
        public int TemporarilyBanned { get; set; }
        public int PermanentlyBanned { get; set; }
        public int TotalBanned { get; set; }
    }

    public class AdminDashboardDestinationEngagementDto
    {
        public int TotalFavoriteAdds { get; set; }
        public int TotalPlannerAdds { get; set; }
        public int RatedDestinations { get; set; }
        public List<AdminDashboardTopEngagedDestinationDto> TopDestinations { get; set; } = new();
        public List<AdminDashboardRegionEngagementDto> RegionEngagement { get; set; } = new();
    }

    public class AdminDashboardTopEngagedDestinationDto
    {
        public int DestinationId { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public string RegionCode { get; set; } = string.Empty;
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public decimal AverageRating { get; set; }
        public decimal EngagementScore { get; set; }
    }

    public class AdminDashboardRegionEngagementDto
    {
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public string RegionCode { get; set; } = string.Empty;
        public int FavoriteAdds { get; set; }
        public int PlannerAdds { get; set; }
        public int ReviewCount { get; set; }
        public int EngagedDestinations { get; set; }
        public decimal AverageRating { get; set; }
        public decimal EngagementScore { get; set; }
    }

    public class AdminDashboardGeospatialOverviewDto
    {
        public int TotalActiveDestinationsWithCoordinates { get; set; }
        public int RegionsRepresented { get; set; }
        public int DisplayedPoints { get; set; }
        public List<AdminDashboardMapPointDto> Points { get; set; } = new();
    }

    public class AdminDashboardMapPointDto
    {
        public int DestinationId { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public int RegionId { get; set; }
        public string RegionName { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
