import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface FavoriteDto {
  id: number;
  userId: number;
  destinationId?: number;
  destinationName?: string;
  objectId?: number;
  objectName?: string;
  activityId?: number;
  activityName?: string;
  routeId?: number;
  routeName?: string;
  localityId?: number;
  localityName?: string;
  createdAt: string;
}

export interface CreateFavoriteDto {
  destinationId?: number;
  objectId?: number;
  activityId?: number;
  routeId?: number;
  localityId?: number;
}

export interface FavoriteQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PagedFavoriteResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

type FavoriteApiResponse =
  | FavoriteDto[]
  | {
      items?: FavoriteDto[];
      Items?: FavoriteDto[];
      data?: FavoriteDto[];
      Data?: FavoriteDto[];
      results?: FavoriteDto[];
      Results?: FavoriteDto[];
      value?: FavoriteDto[];
      Value?: FavoriteDto[];
      totalCount?: number | string;
      TotalCount?: number | string;
      totalPages?: number | string;
      TotalPages?: number | string;
      page?: number | string;
      Page?: number | string;
      pageSize?: number | string;
      PageSize?: number | string;
    };

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly url = `${environment.apiUrl}/favorites`;

  constructor(private readonly http: HttpClient) {}

  getMyFavorites(query: FavoriteQueryDto = { page: 1, pageSize: 200 }): Observable<FavoriteDto[]> {
    return this.getMyFavoritesPaged(query).pipe(map((response) => response.items));
  }

  getMyFavoritesPaged(query: FavoriteQueryDto = {}): Observable<PagedFavoriteResultDto<FavoriteDto>> {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<FavoriteApiResponse>(this.url, { params })
      .pipe(map((response) => this.normalizePagedResponse(response)));
  }

  add(dto: CreateFavoriteDto): Observable<FavoriteDto> {
    return this.http.post<FavoriteDto>(this.url, dto);
  }

  remove(favoriteId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${favoriteId}`);
  }

  private normalizePagedResponse(response: FavoriteApiResponse): PagedFavoriteResultDto<FavoriteDto> {
    const items = this.extractItems(response);

    if (Array.isArray(response)) {
      return {
        items,
        page: 1,
        pageSize: items.length,
        totalCount: items.length,
        totalPages: items.length ? 1 : 0,
      };
    }

    return {
      items,
      page: this.readNumber(response.page ?? response.Page, 1),
      pageSize: this.readNumber(response.pageSize ?? response.PageSize, items.length || 1),
      totalCount: this.readNumber(response.totalCount ?? response.TotalCount, items.length),
      totalPages: this.readNumber(response.totalPages ?? response.TotalPages, items.length ? 1 : 0),
    };
  }

  private extractItems(response: FavoriteApiResponse): FavoriteDto[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.Items)) {
      return response.Items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.Data)) {
      return response.Data;
    }

    if (Array.isArray(response?.results)) {
      return response.results;
    }

    if (Array.isArray(response?.Results)) {
      return response.Results;
    }

    if (Array.isArray(response?.value)) {
      return response.value;
    }

    if (Array.isArray(response?.Value)) {
      return response.Value;
    }

    return [];
  }

  private readNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }
}
