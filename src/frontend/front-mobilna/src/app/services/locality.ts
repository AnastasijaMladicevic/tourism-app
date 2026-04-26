import { Injectable } from '@angular/core';
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
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  localityTypeId: number;
  localityTypeName: string;
  createdByUserId?: number;
  createdAt: string;
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

@Injectable({ providedIn: 'root' })
export class LocalityService {
  private readonly url = `${environment.apiUrl}/Localities`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  private addLang(params: HttpParams): HttpParams {
    const lang = localStorage.getItem('appLanguage') || 'sr';
    return params.set('Lang', lang);
  }

  getAll(
    query?: LocalityQueryParams,
    options?: RegionRequestOptions,
  ): Observable<LocalityDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLang(params);
    return this.http.get<LocalityDto[]>(this.url, { params });
  }

  getById(id: number): Observable<LocalityDto> {
    let params = new HttpParams();
    params = this.addLang(params);
    return this.http.get<LocalityDto>(`${this.url}/${id}`, { params });
  }
}
