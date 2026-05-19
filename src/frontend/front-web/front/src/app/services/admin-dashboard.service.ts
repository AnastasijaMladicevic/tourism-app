import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export type DashboardPeriod = '7d' | '30d' | '3m' | '6m' | '1y' | '5y';

export interface AdminDashboardOverviewDto {
  periodKey: string;
  periodDays: number;
  userGrowthGranularity: 'day' | 'week' | 'month' | string;
  asOfUtc: string;
  periodStartUtc: string;
  summary: AdminDashboardSummaryDto;
  userGrowth: AdminDashboardUserGrowthPointDto[];
  roleDistribution: AdminDashboardRoleDistributionItemDto[];
  destinationsByRegion: AdminDashboardDestinationByRegionDto[];
  creatorRequests: AdminDashboardCreatorRequestStatusDto;
  reports: AdminDashboardReportsSummaryDto;
  accountHealth: AdminDashboardAccountHealthDto;
  destinationVisits: AdminDashboardDestinationVisitsDto;
  geospatialOverview: AdminDashboardGeospatialOverviewDto;
}

export interface AdminDashboardSummaryDto {
  totalTourists: number;
  newTouristsInPeriod: number;
  activeDestinations: number;
  newDestinationsInPeriod: number;
  pendingCreatorRequests: number;
  openReports: number;
}

export interface AdminDashboardUserGrowthPointDto {
  date: string;
  tourists: number;
  contentCreators: number;
  managers: number;
  admins: number;
}

export interface AdminDashboardRoleDistributionItemDto {
  role: string;
  count: number;
}

export interface AdminDashboardDestinationByRegionDto {
  regionId: number;
  regionName: string;
  regionCode: string;
  totalDestinations: number;
  activeDestinations: number;
  geocodedDestinations: number;
}

export interface AdminDashboardCreatorRequestStatusDto {
  pending: number;
  approved: number;
  rejected: number;
  none: number;
  totalSubmitted: number;
}

export interface AdminDashboardReportsSummaryDto {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface AdminDashboardAccountHealthDto {
  verified: number;
  unverified: number;
  active: number;
  inactive: number;
  temporarilyBanned: number;
  permanentlyBanned: number;
  totalBanned: number;
}

export interface AdminDashboardDestinationVisitsDto {
  totalVisits: number;
  uniqueVisitors: number;
  destinationsVisited: number;
  topDestinations: AdminDashboardTopVisitedDestinationDto[];
  regionVisits: AdminDashboardRegionVisitDto[];
}

export interface AdminDashboardTopVisitedDestinationDto {
  destinationId: number;
  destinationName: string;
  regionId: number;
  regionName: string;
  regionCode: string;
  visitCount: number;
  uniqueVisitors: number;
  lastVisitUtc: string | null;
}

export interface AdminDashboardRegionVisitDto {
  regionId: number;
  regionName: string;
  regionCode: string;
  visitCount: number;
  uniqueVisitors: number;
  visitedDestinations: number;
  lastVisitUtc: string | null;
}

export interface AdminDashboardGeospatialOverviewDto {
  totalActiveDestinationsWithCoordinates: number;
  regionsRepresented: number;
  displayedPoints: number;
  points: AdminDashboardMapPointDto[];
}

export interface AdminDashboardMapPointDto {
  destinationId: number;
  destinationName: string;
  regionId: number;
  regionName: string;
  latitude: number;
  longitude: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/dashboard`;

  getOverview(period: DashboardPeriod): Observable<AdminDashboardOverviewDto> {
    const params = new HttpParams().set('period', period);
    return this.http.get<AdminDashboardOverviewDto>(`${this.apiUrl}/overview`, { params });
  }
}
