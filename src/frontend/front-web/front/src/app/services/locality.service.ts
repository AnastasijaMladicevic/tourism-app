import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, concatMap, from, map, of, toArray } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { normalizeEntityMedia, normalizeMediaRow, normalizeMediaRows } from '../shared/utils/media-url';
import { TranslationService } from './translation.service';

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
  boundaryGeoJson?: string;
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

export interface UpdateLocalityDto {
  name?: string;
  description?: string;
  longitude?: number;
  latitude?: number;
  destinationId?: number;
  localityTypeId?: number;
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
  private readonly translationService = inject(TranslationService);

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

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

    params = this.addLang(params, options);
    return this.http.get<PagedResultDto<LocalityDto>>(this.apiUrl, { params }).pipe(
      map((response) => ({
        ...response,
        items: (response?.items ?? []).map((item) => this.normalizeLocality(item))
      }))
    );
  }

  create(dto: CreateLocalityDto): Observable<LocalityDto> {
    return this.http.post<LocalityDto>(this.apiUrl, dto).pipe(
      map((item) => this.normalizeLocality(item))
    );
  }

  getById(id: number): Observable<LocalityDto> {
    const params = this.addLang(new HttpParams());
    return this.http.get<LocalityDto>(`${this.apiUrl}/${id}`, { params }).pipe(
      map((item) => this.normalizeLocality(item))
    );
  }

  update(id: number, dto: UpdateLocalityDto): Observable<LocalityDto> {
    return this.http.put<LocalityDto>(`${this.apiUrl}/${id}`, dto).pipe(
      map((item) => this.normalizeLocality(item))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getImages(localityId: number): Observable<LocalityImageDto[]> {
    return this.http.get<LocalityImageDto[]>(`${this.apiUrl}/${localityId}/images`).pipe(
      map((images) => normalizeMediaRows(images))
    );
  }

  addImage(localityId: number, file: File, isMain: boolean): Observable<LocalityImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    return this.http.post<LocalityImageDto>(`${this.apiUrl}/${localityId}/images`, formData).pipe(
      map((image) => normalizeMediaRow(image))
    );
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

  private normalizeLocality(item: LocalityDto): LocalityDto {
    return normalizeEntityMedia(item);
  }
}
