import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { TranslationService } from './translation.service';

export interface DestinationDto {
  id: number;
  name: string;
  displayTitle?: string;
  description?: string;
  mainImageUrl?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  averageRating?: number;
  reviewCount?: number;
  isActive: boolean;
  status?: string;
  destinationTypeId: number;
  destinationTypeName: string;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  images?: DestinationImageDto[];
  isFavorite?: boolean;
  favoriteId?: number;
}

export interface DestinationImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface DestinationQueryParams {
  page?: number;
  pageSize?: number;
  type?: string;
  search?: string;
  regionId?: number;
  sortBy?: string;
  sortOrder?: string;
  lang?: string;
}

export interface CreateDestinationDto {
  name: string;
  displayTitle?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  destinationTypeId: number;
  regionId?: number;
}

export interface UpdateDestinationDto {
  name?: string;
  displayTitle?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  destinationTypeId?: number;
  regionId?: number;
}

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private readonly url = `${environment.apiUrl}/Destinations`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
    private readonly translationService: TranslationService,
  ) { }

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

  getAll(
    query?: DestinationQueryParams,
    options?: RegionRequestOptions,
  ): Observable<DestinationDto[]> {
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
    return this.http.get<DestinationDto[]>(this.url, { params });
  }

  getById(id: number): Observable<DestinationDto> {
    let params = new HttpParams();
    params = this.addLang(params);
    return this.http.get<DestinationDto>(`${this.url}/${id}`, { params });
  }

  create(dto: CreateDestinationDto): Observable<DestinationDto> {
    return this.http.post<DestinationDto>(this.url, dto);
  }

  update(id: number, dto: UpdateDestinationDto): Observable<DestinationDto> {
    return this.http.put<DestinationDto>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
