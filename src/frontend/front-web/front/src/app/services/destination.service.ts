import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { DestinationQueryDto, DestinationQueryResponse } from '../models/destination.model';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { normalizeEntityMedia, normalizeMediaRow, normalizeMediaRows } from '../shared/utils/media-url';
import { TranslationService } from './translation.service';
export interface DestinationDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  mapPopupVariant?: 'card' | 'label';
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
  managedByUserId?: number;
  images?: DestinationImageDto[];
  isFavorite?: boolean;
  favoriteId?: number;
  editLock?: DestinationEditLockDto;
  boundaryGeoJson?: string;
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
}

export interface CreateDestinationDto {
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  destinationTypeId: number;
  regionId?: number;
  managedByUserId?: number;
}

export interface UpdateDestinationDto {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  destinationTypeId?: number;
  regionId?: number;
}

export interface AssignManagerDto {
  managerUserId: number;
}

export interface DestinationTypeDto {
  id: number;
  name: string;
}

export interface DestinationEditLockDto {
  destinationId: number;
  isLocked: boolean;
  isOwnedByCurrentUser: boolean;
  lockedByUserId?: number;
  lockedByDisplayName?: string;
  acquiredAtUtc?: string;
  expiresAtUtc?: string;
  message: string;
}
@Injectable({
  providedIn: 'root'
})
export class DestinationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Destinations`;
  constructor(
    private readonly activeRegionService: ActiveRegionService,
    private readonly translationService: TranslationService,
  ) {}

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

  getDestinationTypes(): Observable<DestinationTypeDto[]> {
    return this.http.get<DestinationTypeDto[]>(`${this.apiUrl}/types`);
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
    return this.http.get<DestinationDto[] | { items?: DestinationDto[] }>(this.apiUrl, { params }).pipe(
      map((response) => {
        const items = Array.isArray(response) ? response : (response?.items ?? []);
        return items.map((item) => this.normalizeDestination(item));
      })
    );
  }
  getById(id: number): Observable<DestinationDto> {
    const params = this.addLang(new HttpParams());
    return this.http.get<DestinationDto>(`${this.apiUrl}/${id}`, { params }).pipe(
      map((item) => this.normalizeDestination(item))
    );
  }

  create(dto: CreateDestinationDto): Observable<DestinationDto> {
    return this.http.post<DestinationDto>(this.apiUrl, dto).pipe(
      map((item) => this.normalizeDestination(item))
    );
  }

  update(id: number, dto: UpdateDestinationDto): Observable<DestinationDto> {
    return this.http.put<DestinationDto>(`${this.apiUrl}/${id}`, dto).pipe(
      map((item) => this.normalizeDestination(item))
    );
  }

  acquireEditLock(id: number): Observable<DestinationEditLockDto> {
    return this.http.post<DestinationEditLockDto>(`${this.apiUrl}/${id}/edit-lock`, {});
  }

  refreshEditLock(id: number): Observable<DestinationEditLockDto> {
    return this.http.put<DestinationEditLockDto>(`${this.apiUrl}/${id}/edit-lock`, {});
  }

  releaseEditLock(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/edit-lock`);
  }

  assignManager(id: number, managerUserId: number): Observable<DestinationDto> {
    const body: AssignManagerDto = { managerUserId };
    return this.http.put<DestinationDto>(`${this.apiUrl}/${id}/assign-manager`, body).pipe(
      map((item) => this.normalizeDestination(item))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getImages(destinationId: number): Observable<DestinationImageDto[]> {
    return this.http.get<DestinationImageDto[]>(`${environment.apiUrl}/destinations/${destinationId}/images`).pipe(
      map((images) => normalizeMediaRows(images))
    );
  }

  addImage(destinationId: number, file: File, isMain = false, altText?: string): Observable<DestinationImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    if (altText?.trim()) {
      formData.append('altText', altText.trim());
    }
    return this.http.post<DestinationImageDto>(
      `${environment.apiUrl}/destinations/${destinationId}/images`,
      formData
    ).pipe(
      map((image) => normalizeMediaRow(image))
    );
  }

  deleteImageById(imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/images/${imageId}`);
  }

  setMainImage(imageId: number): Observable<DestinationImageDto> {
    return this.http.patch<DestinationImageDto>(`${environment.apiUrl}/images/${imageId}/set-main`, {}).pipe(
      map((image) => normalizeMediaRow(image))
    );
  }

  private normalizeDestination(item: DestinationDto): DestinationDto {
    return normalizeEntityMedia(item);
  }
}
