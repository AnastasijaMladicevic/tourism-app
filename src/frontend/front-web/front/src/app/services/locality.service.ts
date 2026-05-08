import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, concatMap, from, map, of, toArray } from 'rxjs';
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

export interface CreateLocalityDto {
  name: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  destinationId: number;
  localityTypeId: number;
  imageUrl?: string;
}

export interface LocalityImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
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

  create(dto: CreateLocalityDto): Observable<LocalityDto> {
    return this.http.post<LocalityDto>(this.apiUrl, dto);
  }

  addImage(localityId: number, file: File, isMain: boolean): Observable<LocalityImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    return this.http.post<LocalityImageDto>(`${this.apiUrl}/${localityId}/images`, formData);
  }

  attachImages(localityId: number, files: File[], primaryIndex = 0): Observable<LocalityImageDto[]> {
    const cleanFiles = files.filter((file) => file.size > 0);
    if (cleanFiles.length === 0) {
      return of([]);
    }

    return from(cleanFiles).pipe(
      concatMap((file, index) => this.addImage(localityId, file, index === primaryIndex)),
      toArray()
    );
  }

  getFilterOptions(
    options?: RegionRequestOptions
  ): Observable<{ destinationOptions: FilterOption[]; typeOptions: FilterOption[]; statusOptions: FilterOption[] }> {
    return this.getAll(
      {
        page: 1,
        pageSize: 500,
        sortBy: 'name',
        sortOrder: 'asc'
      },
      options
    ).pipe(
      map((response) => {
        const items = response?.items ?? [];

        const destinationOptions = this.toUniqueOptions(
          items.map((item) => item.destinationName)
        );

        const typeOptions = this.toUniqueOptions(
          items.map((item) => item.localityTypeName)
        );

        const statusOptions = this.toUniqueOptions(
          items.map((item) => (item.isActive ? 'Published' : 'Archived'))
        );

        return { destinationOptions, typeOptions, statusOptions };
      })
    );
  }

  private toUniqueOptions(values: Array<string | undefined>): FilterOption[] {
    const unique = values
      .map((value) => value?.trim())
      .filter((value): value is string => !!value)
      .filter((value, index, all) => all.findIndex((x) => x.toLowerCase() === value.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b));

    return unique.map((value) => ({
      value,
      label: value
    }));
  }
}
