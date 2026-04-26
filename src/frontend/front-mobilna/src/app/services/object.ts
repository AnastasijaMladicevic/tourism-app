import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ReviewDto } from './review';
import { ActiveRegionService, RegionRequestOptions } from './active-region';

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

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  private addLang(params: HttpParams): HttpParams {
    const lang = localStorage.getItem('appLanguage') || 'sr';
    return params.set('Lang', lang);
}

  getAll(
    query?: ObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<ObjectDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    // 👉 DODAJ OVO
    const lang = localStorage.getItem('appLanguage') || 'sr';
    params = params.set('Lang', lang);

    return this.http.get<ObjectDto[]>(this.url, { params });
  }

  getById(id: number): Observable<ObjectDto> {
    let params = new HttpParams();
    params = this.addLang(params);

    return this.http.get<ObjectDto>(`${this.url}/${id}`, { params });
}

  getNearby(
    query: NearbyObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ObjectDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options) ?? query;
    let params = new HttpParams();

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
    params = this.addLang(params);
    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/nearby`, { params });
  }

  getByType(typeName: string): Observable<ObjectDto[]> {
    let params = new HttpParams()
      .set('type', typeName);

    params = this.addLang(params);

    return this.http.get<ObjectDto[]>(this.url, { params });
}
}
