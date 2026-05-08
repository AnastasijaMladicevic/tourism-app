import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { ImageDto } from './image';

export interface ReviewDto {
  id: number;
  userId: number;
  userFullName: string;
  objectId: number;
  objectName: string;
  objectTypeName?: string;
  localityName?: string | null;
  destinationName?: string | null;
  address?: string | null;
  rating: number;
  text: string;
  creatorResponse?: string | null;
  creatorResponseAt?: string | null;
  status: string;
  reviewedByUserId?: number | null;
  reviewedByFullName?: string | null;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  createdAt: string;
  images?: ImageDto[];
}

export interface ReviewQueryParams {
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PagedReviewResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly baseUrl = `${environment.apiUrl}/reviews`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) { }

  private addLanguage(params: HttpParams): HttpParams {
    const lang = localStorage.getItem('appLanguage') || 'sr';
    return params.set('LanguageCode', lang);
  }

  getForObject(objectId: number): Observable<ReviewDto[]> {
    let params = new HttpParams();
    params = this.addLanguage(params);
    return this.http.get<ReviewDto[]>(`${this.baseUrl}/object/${objectId}`, { params });
  }

  getAll(
    query?: ReviewQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedReviewResultDto<ReviewDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLanguage(params);
    return this.http.get<PagedReviewResultDto<ReviewDto>>(this.baseUrl, { params });
  }

  getMine(
    query?: ReviewQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedReviewResultDto<ReviewDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLanguage(params);
    return this.http.get<PagedReviewResultDto<ReviewDto>>(`${this.baseUrl}/my`, { params });
  }

  getById(id: number): Observable<ReviewDto> {
    let params = new HttpParams();
    params = this.addLanguage(params);
    return this.http.get<ReviewDto>(`${this.baseUrl}/${id}`, { params });
  }

  create(dto: any): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(this.baseUrl, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  update(id: number, dto: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/reviews/${id}`, dto);
  }
}
