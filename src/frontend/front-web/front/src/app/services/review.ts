import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { TranslationService } from './translation.service';

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
}

export interface ReviewQueryParams {
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  objectId?: number;
  object?: string;
  user?: string;
  ratings?: string;
  minRating?: number;
  maxRating?: number;
  hasResponse?: boolean;
  status?: string;
  languageCode?: string;
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

export interface RespondToReviewDto {
  creatorResponse: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly baseUrl = `${environment.apiUrl}/reviews`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
    private readonly translationService: TranslationService,
  ) {}

  private addLanguageCode(
    params: HttpParams,
    options?: RegionRequestOptions,
  ): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('languageCode', this.translationService.language());
  }

  getForObject(objectId: number): Observable<ReviewDto[]> {
    const params = this.addLanguageCode(new HttpParams());
    return this.http.get<ReviewDto[]>(`${this.baseUrl}/object/${objectId}`, { params });
  }

  getAll(
    query?: ReviewQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ReviewDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLanguageCode(params, options);
    return this.http
      .get<PagedResultDto<ReviewDto> | ReviewDto[]>(this.baseUrl, { params })
      .pipe(map((response) => this.normalizePagedResult(response, effectiveQuery?.page, effectiveQuery?.pageSize)));
  }

  getForCreator(
    query?: ReviewQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ReviewDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLanguageCode(params, options);
    return this.http.get<PagedResultDto<ReviewDto>>(`${this.baseUrl}/creator`, { params });
  }

  getForManagerObjects(objectIds: number[]): Observable<ReviewDto[]> {
    if (!objectIds.length) {
      return new Observable<ReviewDto[]>((subscriber) => {
        subscriber.next([]);
        subscriber.complete();
      });
    }

    let params = this.addLanguageCode(new HttpParams()).set('objectIds', objectIds.join(','));
    return this.http.get<ReviewDto[]>(`${this.baseUrl}/for-manager`, { params });
  }

  getById(id: number): Observable<ReviewDto> {
    const params = this.addLanguageCode(new HttpParams());
    return this.http.get<ReviewDto>(`${this.baseUrl}/${id}`, { params });
  }

  create(dto: any): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(this.baseUrl, dto);
  }

  respond(id: number, dto: RespondToReviewDto): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(`${this.baseUrl}/${id}/respond`, dto);
  }

  updateResponse(id: number, dto: RespondToReviewDto): Observable<ReviewDto> {
    return this.http.put<ReviewDto>(`${this.baseUrl}/${id}/respond`, dto);
  }

  deleteResponse(id: number): Observable<ReviewDto> {
    return this.http.delete<ReviewDto>(`${this.baseUrl}/${id}/respond`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private normalizePagedResult(
    response: PagedResultDto<ReviewDto> | ReviewDto[],
    requestedPage?: number,
    requestedPageSize?: number,
  ): PagedResultDto<ReviewDto> {
    if (Array.isArray(response)) {
      const page = requestedPage ?? 1;
      const pageSize = (requestedPageSize ?? response.length) || 1;
      return {
        items: response,
        page,
        pageSize,
        totalCount: response.length,
        totalPages: 1
      };
    }

    return {
      items: response.items ?? [],
      page: response.page ?? requestedPage ?? 1,
      pageSize: response.pageSize ?? requestedPageSize ?? (response.items?.length ?? 0),
      totalCount: response.totalCount ?? (response.items?.length ?? 0),
      totalPages: response.totalPages ?? 1
    };
  }
}
