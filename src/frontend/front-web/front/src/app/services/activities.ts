import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
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
  startDate?: string;
  endDate?: string;
}

export interface ActivityQueryResponse {
  items: ActivityDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityTypeOption {
  id: number;
  name: string;
}

export interface LocalityOption {
  id: number;
  name: string;
  destinationId: number;
  destinationName: string;
}

export interface CreateActivityDto {
  name: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  price?: number;
  durationMinutes?: number;
  activityTypeId: number;
  localityId?: number;
  destinationId?: number;
  objectId?: number;
}

export interface UpdateActivityDto {
  name?: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  price?: number;
  durationMinutes?: number;
  activityTypeId?: number;
  localityId?: number;
  destinationId?: number;
  objectId?: number;
}

interface AddImageDto {
  url: string;
  altText?: string;
  isMain: boolean;
}

interface PagedResponse<T> {
  items?: T[];
}

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {
  private readonly apiUrl = `${environment.apiUrl}/activities`;
  private readonly localitiesApiUrl = `${environment.apiUrl}/localities`;

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

  create(dto: CreateActivityDto): Observable<ActivityDto> {
    return this.http.post<ActivityDto>(this.apiUrl, dto);
  }

  getById(id: number): Observable<ActivityDto> {
    return this.http.get<ActivityDto>(`${this.apiUrl}/${id}`);
  }

  update(id: number, dto: UpdateActivityDto): Observable<ActivityDto> {
    return this.http.put<ActivityDto>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  attachImages(activityId: number, imageUrls: string[]): Observable<unknown[]> {
    const requests = imageUrls
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .map((url, index) => {
        const payload: AddImageDto = {
          url,
          isMain: index === 0
        };

        return this.http.post(`${this.apiUrl}/${activityId}/images`, payload);
      });

    return requests.length > 0 ? forkJoin(requests) : forkJoin([]);
  }

  getActivityTypeOptions(): Observable<ActivityTypeOption[]> {
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '200')
      .set('sortBy', 'activityTypeName')
      .set('sortOrder', 'asc');

    return this.http
      .get<PagedResponse<ActivityDto> | ActivityDto[]>(this.apiUrl, { params })
      .pipe(map((response) => {
        const items = this.extractItems(response);
        const unique = new Map<number, ActivityTypeOption>();

        for (const item of items) {
          if (!item.activityTypeId) {
            continue;
          }

          if (!unique.has(item.activityTypeId)) {
            unique.set(item.activityTypeId, {
              id: item.activityTypeId,
              name: item.activityTypeName || `Type #${item.activityTypeId}`
            });
          }
        }

        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
      }));
  }

  getLocalityOptions(): Observable<LocalityOption[]> {
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '500')
      .set('sortBy', 'name')
      .set('sortOrder', 'asc');

    return this.http
      .get<PagedResponse<LocalityOption> | LocalityOption[]>(this.localitiesApiUrl, { params })
      .pipe(map((response) => this.extractItems(response)));
  }

  private extractItems<T>(response: PagedResponse<T> | T[]): T[] {
    return Array.isArray(response) ? response : (response.items ?? []);
  }
}