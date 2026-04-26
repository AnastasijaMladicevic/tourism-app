import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';

export interface EventDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  distanceMeters?: number;
  startDate: string;
  endDate: string;
  price?: number;
  maxVisitors?: number;
  isActive: boolean;
  status: string;
  eventTypeId: number;
  eventTypeName: string;
  localityId?: number;
  localityName?: string;
  destinationId?: number;
  destinationName?: string;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  objectId?: number;
  objectName?: string;
  images?: EventImageDto[];
}

export interface EventImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface EventQueryParams {
  type?: string;
  destination?: string;
  status?: string;
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  date?: string;
  nextDays?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface NearbyEventQueryParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  regionId?: number;
  type?: string;
  destination?: string;
  search?: string;
  date?: string;
  nextDays?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: string;
}

export interface PagedEventResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly url = `${environment.apiUrl}/events`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    const lang = localStorage.getItem('appLanguage') || 'sr';
    return params.set('Lang', lang);
  }

  getById(id: number): Observable<EventDto> {
    let params = new HttpParams();
    params = this.addLang(params);
    return this.http.get<EventDto>(`${this.url}/${id}`, { params });
  }

  getAll(
    query?: EventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<EventDto[]> {
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
    return this.http.get<EventDto[]>(this.url, { params });
  }

  getNearby(
    query: NearbyEventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedEventResultDto<EventDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options) ?? query;
    let params = new HttpParams();

    Object.entries(effectiveQuery).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    params = this.addLang(params, options);
    return this.http.get<PagedEventResultDto<EventDto>>(`${this.url}/nearby`, { params });
  }
}
