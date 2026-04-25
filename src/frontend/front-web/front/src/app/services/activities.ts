import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ActivityDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  distanceMeters?: number;
  hasPendingDeletionRequest: boolean;
  isActive: boolean;
  price?: number;
  durationMinutes?: number;
  activityTypeId: number;
  activityTypeName: string;
  localityId?: number;
  localityName?: string;
  destinationId?: number;
  destinationName?: string;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  objectId?: number;
  objectName?: string;
  createdByUserId: number;
  status: string;
  approvedByUserId?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityQueryDto {
  type?: string;
  destination?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ActivityQueryResponse {
  items: ActivityDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {
  private readonly apiUrl = `${environment.apiUrl}/activities`;

  constructor(private readonly http: HttpClient) {}

  getMyActivities(query?: ActivityQueryDto): Observable<ActivityQueryResponse> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<ActivityQueryResponse>(`${this.apiUrl}/my`, { params });
  }
}