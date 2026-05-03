import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
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
  private readonly fetchBatchSize = 100;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) { }

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

  private buildParams(
    query?: EventQueryParams | NearbyEventQueryParams,
    options?: RegionRequestOptions,
  ): HttpParams {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.addLang(params, options);
  }

  getPage(
    query?: EventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedEventResultDto<EventDto>> {
    const params = this.buildParams(query, options);
    return this.http.get<PagedEventResultDto<EventDto>>(this.url, { params });
  }

  getAll(
    query?: EventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<EventDto[]> {
    return this.getPage(query, options).pipe(
      map((result) => result.items ?? []),
    );
  }

  getAllItems(
    query?: EventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<EventDto[]> {
    const firstQuery: EventQueryParams = {
      ...query,
      page: 1,
      pageSize: this.fetchBatchSize,
    };

    return this.getPage(firstQuery, options).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, Number(firstPage.totalPages ?? 1));

        if (totalPages <= 1) {
          return of(firstItems);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
          this.getPage(
            {
              ...query,
              page: index + 2,
              pageSize: this.fetchBatchSize,
            },
            options,
          ),
        );

        return forkJoin(requests).pipe(
          map((pages) => [
            ...firstItems,
            ...pages.flatMap((page) => page.items ?? []),
          ]),
        );
      }),
    );
  }

  getNearby(
    query: NearbyEventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedEventResultDto<EventDto>> {
    const params = this.buildParams(query, options);
    return this.http.get<PagedEventResultDto<EventDto>>(`${this.url}/nearby`, { params });
  }
}
