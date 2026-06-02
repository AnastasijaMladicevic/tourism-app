import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { ReviewDto } from './review';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { DataCacheService } from './data-cache';
import { TranslationService } from './translation.service';

export interface ObjectImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface ObjectDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  menuUrl?: string;
  cuisineType?: string;
  workingHours?: string;
  price?: Int16Array;
  amenities?: [];
  longitude?: number;
  latitude?: number;
  averageRating?: number;
  reviewCount?: number;
  distanceKm?: number;
  distanceMeters?: number;
  isActive: boolean;
  objectTypeId: number;
  objectTypeName: string;
  localityId?: number;
  localityName?: string;
  destinationId?: number;
  destinationName?: string;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  images?: ObjectImageDto[];
  reviews?: ReviewDto[];
}

export interface ObjectView extends ObjectDto {
  isFavorite: boolean;
  favoriteId?: number;
}

export interface ObjectQueryParams {
  type?: string;
  destination?: string;
  locality?: string;
  status?: string;
  regionId?: number;
  amenities?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface NearbyObjectQueryParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  regionId?: number;
  type?: string;
  destination?: string;
  locality?: string;
  search?: string;
  amenities?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
  sortOrder?: string;
}

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ObjectService {
  private readonly url = `${environment.apiUrl}/objects`;
  private readonly fetchBatchSize = 100;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
    private readonly translationService: TranslationService,
    private readonly dataCache: DataCacheService,
  ) { }

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

  private buildParams(
    query?: ObjectQueryParams | NearbyObjectQueryParams,
    options?: RegionRequestOptions,
  ): HttpParams {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value == null || value === '') {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item != null && item !== '') {
              params = params.append(key, String(item));
            }
          });
          return;
        }

        params = params.set(key, String(value));
      });
    }

    return this.addLang(params, options);
  }

  getPage(
    query?: ObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ObjectDto>> {
    const params = this.buildParams(query, options);
    return this.http.get<PagedResultDto<ObjectDto>>(this.url, { params });
  }

  getAll(
    query?: ObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<ObjectDto[]> {
    return this.getPage(query, options).pipe(
      map((result) => result.items ?? []),
    );
  }

  getAllItems(
    query?: ObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<ObjectDto[]> {
    const firstQuery: ObjectQueryParams = {
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

  getById(id: number): Observable<ObjectDto> {
    const lang = this.translationService.language();
    const cacheKey = `object:${id}:${lang}`;
    const cached = this.dataCache.get<ObjectDto>(cacheKey);
    if (cached) return of(cached);

    let params = new HttpParams();
    params = this.addLang(params);
    return this.http.get<ObjectDto>(`${this.url}/${id}`, { params }).pipe(
      tap((result) => this.dataCache.set(cacheKey, result)),
    );
  }

  getNearby(
    query: NearbyObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ObjectDto>> {
    const params = this.buildParams(query, options);
    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/nearby`, { params });
  }

  getByType(typeName: string): Observable<ObjectDto[]> {
    let params = new HttpParams().set('type', typeName);
    params = this.addLang(params);

    return this.http.get<ObjectDto[]>(this.url, { params });
  }
}
