import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export type ManagerDashboardPeriod = '7d' | '30d' | '3m' | '6m' | '1y' | '5y';

export interface ManagerDashboardOverviewDto {
  periodKey: string;
  periodDays: number;
  engagementTrendGranularity: 'day' | 'week' | 'month' | string;
  asOfUtc: string;
  periodStartUtc: string;
  hasManagedDestination: boolean;
  destination: ManagerDashboardDestinationDto | null;
  summary: ManagerDashboardSummaryDto;
  moderationQueue: ManagerDashboardModerationQueueDto;
  reports: ManagerDashboardReportsDto;
  contentStatus: ManagerDashboardContentStatusDto;
  engagementTrend: ManagerDashboardTrendPointDto[];
  topContent: ManagerDashboardTopContentItemDto[];
  topCreators: ManagerDashboardTopCreatorItemDto[];
  localityPerformance: ManagerDashboardLocalityPerformanceItemDto[];
  upcomingEvents: ManagerDashboardUpcomingEventsDto;
}

export interface ManagerDashboardDestinationDto {
  destinationId: number;
  destinationName: string;
  displayTitle: string | null;
  status: string;
  isActive: boolean;
  regionId: number;
  regionName: string;
  regionCode: string;
  localityCount: number;
}

export interface ManagerDashboardSummaryDto {
  activeCreators: number;
  activeObjects: number;
  activeEvents: number;
  activeActivities: number;
  pendingModerationItems: number;
  openReports: number;
  favoritesInPeriod: number;
  plannerAddsInPeriod: number;
  newReviewsInPeriod: number;
  unansweredReviews: number;
  lowRatedReviewsInPeriod: number;
  averageRatingInPeriod: number;
  upcomingEventsInNext30Days: number;
}

export interface ManagerDashboardModerationQueueDto {
  pendingObjects: number;
  pendingEvents: number;
  pendingActivities: number;
  pendingDeletionRequests: number;
  totalPending: number;
}

export interface ManagerDashboardReportsDto {
  currentPending: number;
  submittedInPeriod: number;
  approvedInPeriod: number;
  rejectedInPeriod: number;
  totalInPeriod: number;
}

export interface ManagerDashboardContentStatusDto {
  overall: ManagerDashboardStatusBucketDto;
  objects: ManagerDashboardStatusBucketDto;
  events: ManagerDashboardStatusBucketDto;
  activities: ManagerDashboardStatusBucketDto;
}

export interface ManagerDashboardStatusBucketDto {
  total: number;
  published: number;
  pending: number;
  rejected: number;
}

export interface ManagerDashboardTrendPointDto {
  date: string;
  favorites: number;
  plannerAdds: number;
  reviews: number;
}

export interface ManagerDashboardTopContentItemDto {
  contentType: string;
  contentId: number;
  contentName: string;
  status: string;
  creatorId: number;
  creatorName: string;
  creatorEmail: string;
  localityId: number | null;
  localityName: string | null;
  favoriteAdds: number;
  plannerAdds: number;
  reviewCount: number;
  averageRating: number;
  engagementScore: number;
}

export interface ManagerDashboardTopCreatorItemDto {
  creatorId: number;
  creatorName: string;
  creatorEmail: string;
  contentItems: number;
  publishedItems: number;
  pendingItems: number;
  favoriteAdds: number;
  plannerAdds: number;
  reviewCount: number;
  averageRating: number;
  engagementScore: number;
}

export interface ManagerDashboardLocalityPerformanceItemDto {
  localityId: number | null;
  localityName: string;
  contentItems: number;
  favoriteAdds: number;
  plannerAdds: number;
  reviewCount: number;
  averageRating: number;
  engagementScore: number;
}

export interface ManagerDashboardUpcomingEventsDto {
  next7Days: number;
  next30Days: number;
  items: ManagerDashboardUpcomingEventItemDto[];
}

export interface ManagerDashboardUpcomingEventItemDto {
  eventId: number;
  eventName: string;
  startDate: string;
  creatorId: number;
  creatorName: string;
  creatorEmail: string;
  localityId: number | null;
  localityName: string | null;
}

@Injectable({ providedIn: 'root' })
export class ManagerDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/manager/dashboard`;

  getOverview(period: ManagerDashboardPeriod): Observable<ManagerDashboardOverviewDto> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ManagerDashboardOverviewDto>(`${this.apiUrl}/overview`, { params });
  }
}
