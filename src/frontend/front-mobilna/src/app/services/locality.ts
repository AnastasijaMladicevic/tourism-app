import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { DataCacheService } from './data-cache';
import { TranslationService } from './translation.service';

export interface LocalityDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  isActive: boolean;
  distanceMeters?: number;
  destinationId: number;
  destinationName: string;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  localityTypeId: number;
  localityTypeName: string;
  createdByUserId?: number;
  createdAt: string;
  images?: LocalityImageDto[];
}
export interface LocalityImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}
export interface LocalityQueryParams {
  type?: string;
  destination?: string;
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}
export interface NearbyLocalityQueryParams {
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
export interface PagedLocalityResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class LocalityService {
  private readonly url = `${environment.apiUrl}/Localities`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
    private readonly translationService: TranslationService,
    private readonly dataCache: DataCacheService,
  ) { }
  getNearby(
    query: NearbyLocalityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedLocalityResultDto<LocalityDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options) ?? query;
    let params = new HttpParams();

    Object.entries(effectiveQuery).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    params = this.addLang(params, options);
    return this.http.get<PagedLocalityResultDto<LocalityDto>>(`${this.url}/nearby`, { params });
  }
  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

  getAll(
    query?: LocalityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<LocalityDto[]> {
    return this.getPage(query, options).pipe(
      map((result) => result.items ?? []),
    );
  }

  getPage(
    query?: LocalityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedLocalityResultDto<LocalityDto>> {
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
    return this.http.get<PagedLocalityResultDto<LocalityDto>>(this.url, { params });
  }

  getById(id: number): Observable<LocalityDto> {
    const lang = this.translationService.language();
    const cacheKey = `locality:${id}:${lang}`;
    const cached = this.dataCache.get<LocalityDto>(cacheKey);
    if (cached) return of(cached);

    let params = new HttpParams();
    params = this.addLang(params);
    return this.http.get<LocalityDto>(`${this.url}/${id}`, { params }).pipe(
      tap((result) => this.dataCache.set(cacheKey, result)),
    );
  }
}
