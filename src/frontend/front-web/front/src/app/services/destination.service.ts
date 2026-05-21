import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { DestinationQueryDto, DestinationQueryResponse } from '../models/destination.model';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
export interface DestinationDto {
  id: number;
  name: string;
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
  managedByUserId?: number;
  images?: DestinationImageDto[];
  isFavorite?: boolean;
  favoriteId?: number;
  editLock?: DestinationEditLockDto;
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
  ) {}
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

    return this.http.get<DestinationDto[]>(this.apiUrl, { params });
  }
  getById(id: number): Observable<DestinationDto> {
    return this.http.get<DestinationDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateDestinationDto): Observable<DestinationDto> {
    return this.http.post<DestinationDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateDestinationDto): Observable<DestinationDto> {
    return this.http.put<DestinationDto>(`${this.apiUrl}/${id}`, dto);
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
    return this.http.put<DestinationDto>(`${this.apiUrl}/${id}/assign-manager`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getImages(destinationId: number): Observable<DestinationImageDto[]> {
    return this.http.get<DestinationImageDto[]>(`${environment.apiUrl}/destinations/${destinationId}/images`);
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
    );
  }

  deleteImageById(imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/images/${imageId}`);
  }

  setMainImage(imageId: number): Observable<DestinationImageDto> {
    return this.http.patch<DestinationImageDto>(`${environment.apiUrl}/images/${imageId}/set-main`, {});
  }
}
