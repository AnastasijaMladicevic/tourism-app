import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';

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
  regionId: number;
  regionName: string;
  regionCode: string;
  localityTypeId: number;
  localityTypeName: string;
  createdByUserId?: number;
  createdAt: string;
}

export interface LocalityQueryParams {
  destination?: string;
  type?: string;
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  lang?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocalityService {
  private readonly http = inject(HttpClient);
  private readonly activeRegionService = inject(ActiveRegionService);
  private readonly apiUrl = `${environment.apiUrl}/localities`;

  getAll(
    query?: LocalityQueryParams,
    options?: RegionRequestOptions
  ): Observable<PagedResultDto<LocalityDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<PagedResultDto<LocalityDto>>(this.apiUrl, { params });
  }
}
