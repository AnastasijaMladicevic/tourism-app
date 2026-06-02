import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { DataCacheService } from './data-cache';
import { TranslationService } from './translation.service';

export interface ActivityDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  distanceMeters?: number;
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
  images?: ActivityImageDto[];
}
export interface ActivityImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}
export interface ActivityQueryParams {
  type?: string;
  destination?: string;
  status?: string;
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}
export interface NearbyActivityQueryParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  regionId?: number;
  type?: string;
  destination?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: string;
}
export interface PagedActivityResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly url = `${environment.apiUrl}/activities`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
    private readonly translationService: TranslationService,
    private readonly dataCache: DataCacheService,
  ) { }
  getNearby(
    query: NearbyActivityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedActivityResultDto<ActivityDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options) ?? query;
    let params = new HttpParams();

    Object.entries(effectiveQuery).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    params = this.addLang(params, options);
    return this.http.get<PagedActivityResultDto<ActivityDto>>(`${this.url}/nearby`, { params });
  }

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

  getAll(
    query?: ActivityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<ActivityDto[]> {
    return this.getPage(query, options).pipe(
      map((result) => result.items ?? []),
    );
  }

  getPage(
    query?: ActivityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedActivityResultDto<ActivityDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLang(params, options);
    return this.http.get<PagedActivityResultDto<ActivityDto>>(this.url, { params });
  }

  getById(id: number): Observable<ActivityDto> {
    const lang = this.translationService.language();
    const cacheKey = `activity:${id}:${lang}`;
    const cached = this.dataCache.get<ActivityDto>(cacheKey);
    if (cached) return of(cached);

    let params = new HttpParams();
    params = this.addLang(params);
    return this.http.get<ActivityDto>(`${this.url}/${id}`, { params }).pipe(
      tap((result) => this.dataCache.set(cacheKey, result)),
    );
  }
}
