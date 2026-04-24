import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';

export interface ReviewDto {
  id: number;
  userId: number;
  userFullName: string;
  objectId: number;
  objectName: string;
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
}

export interface ReviewQueryParams {
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly baseUrl = `${environment.apiUrl}/reviews`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  getForObject(objectId: number): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.baseUrl}/object/${objectId}`);
  }

  getAll(
    query?: ReviewQueryParams,
    options?: RegionRequestOptions,
  ): Observable<ReviewDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<ReviewDto[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ReviewDto> {
    return this.http.get<ReviewDto>(`${this.baseUrl}/${id}`);
  }

  create(dto: any): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(this.baseUrl, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
