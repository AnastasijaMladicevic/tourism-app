import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export type ContentCreatorDashboardPeriod = '7d' | '30d' | '3m' | '6m' | '1y' | '5y';

export interface ContentCreatorDashboardOverviewDto {
  periodKey: string;
  periodDays: number;
  engagementTrendGranularity: 'day' | 'week' | 'month' | string;
  asOfUtc: string;
  periodStartUtc: string;
  summary: ContentCreatorDashboardSummaryDto;
  contentStatus: ContentCreatorDashboardContentStatusDto;
  engagementTrend: ContentCreatorDashboardTrendPointDto[];
  topContent: ContentCreatorDashboardTopContentItemDto[];
  topDestinations: ContentCreatorDashboardTopDestinationItemDto[];
  ratingDistribution: ContentCreatorDashboardRatingDistributionDto;
  upcomingEvents: ContentCreatorDashboardUpcomingEventsDto;
}

export interface ContentCreatorDashboardSummaryDto {
  totalContent: number;
  publishedContent: number;
  pendingContent: number;
  rejectedContent: number;
  favoritesInPeriod: number;
  plannerAddsInPeriod: number;
  newReviewsInPeriod: number;
  unansweredReviews: number;
  averageRatingInPeriod: number;
  upcomingEventsInNext30Days: number;
}

export interface ContentCreatorDashboardContentStatusDto {
  overall: ContentCreatorDashboardStatusBucketDto;
  objects: ContentCreatorDashboardStatusBucketDto;
  events: ContentCreatorDashboardStatusBucketDto;
  activities: ContentCreatorDashboardStatusBucketDto;
}

export interface ContentCreatorDashboardStatusBucketDto {
  total: number;
  published: number;
  pending: number;
  rejected: number;
}

export interface ContentCreatorDashboardTrendPointDto {
  date: string;
  favorites: number;
  plannerAdds: number;
  reviews: number;
}

export interface ContentCreatorDashboardTopContentItemDto {
  contentType: string;
  contentId: number;
  contentName: string;
  status: string;
  destinationId: number | null;
  destinationName: string | null;
  regionId: number | null;
  regionName: string | null;
  regionCode: string | null;
  favoriteAdds: number;
  plannerAdds: number;
  reviewCount: number;
  averageRating: number;
  engagementScore: number;
}

export interface ContentCreatorDashboardTopDestinationItemDto {
  destinationId: number;
  destinationName: string;
  regionId: number;
  regionName: string;
  regionCode: string;
  contentItems: number;
  favoriteAdds: number;
  plannerAdds: number;
  reviewCount: number;
  averageRating: number;
  engagementScore: number;
}

export interface ContentCreatorDashboardRatingDistributionDto {
  oneStar: number;
  twoStars: number;
  threeStars: number;
  fourStars: number;
  fiveStars: number;
  totalReviews: number;
}

export interface ContentCreatorDashboardUpcomingEventsDto {
  next7Days: number;
  next30Days: number;
  items: ContentCreatorDashboardUpcomingEventItemDto[];
}

export interface ContentCreatorDashboardUpcomingEventItemDto {
  eventId: number;
  eventName: string;
  startDate: string;
  destinationId: number | null;
  destinationName: string | null;
  regionId: number | null;
  regionName: string | null;
  regionCode: string | null;
}

@Injectable({ providedIn: 'root' })
export class ContentCreatorDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/content-creator/dashboard`;

  getOverview(period: ContentCreatorDashboardPeriod): Observable<ContentCreatorDashboardOverviewDto> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ContentCreatorDashboardOverviewDto>(`${this.apiUrl}/overview`, { params });
  }
}
