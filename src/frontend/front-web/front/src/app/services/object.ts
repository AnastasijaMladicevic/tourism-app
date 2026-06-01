import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { ReviewDto } from './review';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { ApproveContentDto } from '../models/event.model';

export interface ObjectImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface ObjectDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  menuUrl?: string;
  cuisineType?: string;
  workingHours?: string;
  price?: number;
  amenities?: string[];
  longitude?: number;
  latitude?: number;
  averageRating?: number;
  reviewCount?: number;
  /** Present on API responses for tourist objects (ownership / audit). */
  createdByUserId?: number;
  createdByFullName?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  hasPendingDeletionRequest?: boolean;
  distanceKm?: number;
  distanceMeters?: number;
  isActive: boolean;
  objectTypeId: number;
  objectTypeName: string;
  localityId?: number;
  localityName?: string;
  destinationId?: number;
  destinationName?: string;
  regionId?: number;
  regionName?: string;
  regionCode?: string;
  images?: ObjectImageDto[];
  reviews?: ReviewDto[];
}

export interface ObjectView extends ObjectDto {
  isFavorite: boolean;
  favoriteId?: number;
}

export interface ObjectQueryParams {
  type?: string;
  destination?: string;
  locality?: string;
  status?: string;
  minRating?: number;
  maxRating?: number;
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface NearbyObjectQueryParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  regionId?: number;
  type?: string;
  destination?: string;
  locality?: string;
  search?: string;
  amenities?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
  sortOrder?: string;
}

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface ObjectTypeOption {
  id: number;
  name: string;
}

export interface CreateObjectDto {
  name: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  menuUrl?: string;
  cuisineType?: string;
  workingHours?: string;
  price?: number;
  amenities?: string[];
  longitude?: number;
  latitude?: number;
  objectTypeId: number;
  destinationId?: number;
  localityId?: number;
}

export interface UpdateObjectDto {
  name?: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  menuUrl?: string;
  cuisineType?: string;
  workingHours?: string;
  price?: number;
  amenities?: string[];
  longitude?: number;
  latitude?: number;
  objectTypeId?: number;
  destinationId?: number;
  localityId?: number;
}

export type ObjectPriceMode = 'hidden' | 'ticket' | 'starting';
export type ObjectPriceLabelKey = 'common.price' | 'object.price.ticket' | 'object.price.starting';

const TICKET_OBJECT_TYPE_KEYWORDS = [
  'muzej',
  'museum',
  'galerija',
  'gallery',
  'akva park',
  'aqua park',
  'aquapark',
  'zoo vrt',
  'zoo',
  'akvarijum',
  'aquarium',
  'pozoriste',
  'pozorište',
  'theatre',
  'theater',
  'bioskop',
  'cinema',
];

const NON_PRICED_OBJECT_TYPE_KEYWORDS = [
  'benzinska pumpa',
  'gas station',
  'bolnica',
  'hospital',
  'clinic',
  'biblioteka',
  'library',
  'crkva',
  'church',
  'manastir',
  'monastery',
  'spomenik',
  'monument',
  'trzni centar',
  'tržni centar',
  'shopping centar',
  'shopping center',
  'mall',
  'trznica',
  'tržnica',
  'suvenirnica',
  'igraliste',
  'igralište',
];

function normalizeObjectTypeName(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesObjectTypeKeyword(typeName: string, keywords: string[]): boolean {
  return keywords.some((keyword) => typeName.includes(normalizeObjectTypeName(keyword)));
}

export function getObjectPriceMode(typeName?: string | null): ObjectPriceMode {
  const normalizedTypeName = normalizeObjectTypeName(typeName);
  if (!normalizedTypeName) {
    return 'starting';
  }

  if (matchesObjectTypeKeyword(normalizedTypeName, NON_PRICED_OBJECT_TYPE_KEYWORDS)) {
    return 'hidden';
  }

  if (matchesObjectTypeKeyword(normalizedTypeName, TICKET_OBJECT_TYPE_KEYWORDS)) {
    return 'ticket';
  }

  return 'starting';
}

export function shouldShowObjectPrice(typeName?: string | null): boolean {
  return getObjectPriceMode(typeName) !== 'hidden';
}

export function getObjectPriceLabelKey(typeName?: string | null): ObjectPriceLabelKey {
  switch (getObjectPriceMode(typeName)) {
    case 'ticket':
      return 'object.price.ticket';
    case 'starting':
      return 'object.price.starting';
    default:
      return 'common.price';
  }
}

@Injectable({ providedIn: 'root' })
export class ObjectService {
  private readonly url = `${environment.apiUrl}/objects`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  getAll(
    query?: ObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<ObjectDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<ObjectDto[]>(this.url, { params });
  }

  getById(id: number): Observable<ObjectDto> {
    return this.http.get<ObjectDto>(`${this.url}/${id}`);
  }

  getNearby(
    query: NearbyObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ObjectDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options) ?? query;
    let params = new HttpParams();

    Object.entries(effectiveQuery).forEach(([key, value]) => {
      if (value == null || value === '') {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item != null && item !== '') {
            params = params.append(key, String(item));
          }
        });
        return;
      }

      params = params.set(key, String(value));
    });

    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/nearby`, { params });
  }

  getByType(typeName: string): Observable<ObjectDto[]> {
    return this.http.get<ObjectDto[]>(`${this.url}?type=${typeName}`);
  }

  getMy(
    query?: ObjectQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedResultDto<ObjectDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/my`, { params });
  }

  /** Objects assigned to the signed-in manager's destinations (server-scoped; do not apply client region filter). */
  getForManager(query?: ObjectQueryParams): Observable<PagedResultDto<ObjectDto>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/manager`, { params });
  }

  getManagerFilterOptions(): Observable<{ typeOptions: FilterOption[]; statusOptions: FilterOption[] }> {
    return this.getForManager({
      page: 1,
      pageSize: 500,
      sortBy: 'name',
      sortOrder: 'asc'
    }).pipe(
      map((response) => {
        const items = response?.items ?? [];

        const typeOptions = this.toUniqueOptions(
          items.map((item) => item.objectTypeName),
          (value) => value
        );

        const statusOptions = this.toUniqueOptions(
          items.map((item) => item.status),
          (value) => this.toTitleCase(value ?? '')
        );

        return { typeOptions, statusOptions };
      })
    );
  }

  getMyFilterOptions(): Observable<{ typeOptions: FilterOption[]; statusOptions: FilterOption[] }> {
    return this.getMy({
      page: 1,
      pageSize: 500,
      sortBy: 'name',
      sortOrder: 'asc'
    }, { bypassRegion: true }).pipe(
      map((response) => {
        const items = response?.items ?? [];

        const typeOptions = this.toUniqueOptions(
          items.map((item) => item.objectTypeName),
          (value) => value
        );

        const statusOptions = this.toUniqueOptions(
          items.map((item) => item.status),
          (value) => this.toTitleCase(value)
        );

        return { typeOptions, statusOptions };
      })
    );
  }

  getObjectTypeOptions(): Observable<ObjectTypeOption[]> {
    return this.getAll({
      page: 1,
      pageSize: 500,
      sortBy: 'objectTypeName',
      sortOrder: 'asc'
    }, { bypassRegion: true }).pipe(
      map((response) => {
        const items = Array.isArray(response)
          ? response
          : ((response as unknown as { items?: ObjectDto[] })?.items ?? []);
        const unique = new Map<number, ObjectTypeOption>();

        for (const item of items) {
          if (!item.objectTypeId) {
            continue;
          }

          if (!unique.has(item.objectTypeId)) {
            unique.set(item.objectTypeId, {
              id: item.objectTypeId,
              name: item.objectTypeName || `Type #${item.objectTypeId}`
            });
          }
        }

        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  create(dto: CreateObjectDto): Observable<ObjectDto> {
    return this.http.post<ObjectDto>(this.url, dto);
  }

  addImage(objectId: number, file: File, isMain = false, altText?: string): Observable<ObjectImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    if (altText?.trim()) {
      formData.append('altText', altText.trim());
    }

    return this.http.post<ObjectImageDto>(`${this.url}/${objectId}/images`, formData);
  }

  /** Lists images linked to a tourist object (same payload as `ObjectDto.images` when populated). */
  getImages(objectId: number): Observable<ObjectImageDto[]> {
    return this.http.get<ObjectImageDto[]>(`${this.url}/${objectId}/images`);
  }

  /** Deletes a stored image row by global image id (`api/images/{id}`). */
  deleteImageById(imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/images/${imageId}`);
  }

  /** Marks an image as the main image for its entity. */
  setMainImage(imageId: number): Observable<ObjectImageDto> {
    return this.http.patch<ObjectImageDto>(`${environment.apiUrl}/images/${imageId}/set-main`, {});
  }

  update(id: number, dto: UpdateObjectDto): Observable<ObjectDto> {
    return this.http.put<ObjectDto>(`${this.url}/${id}`, dto);
  }

  approve(id: number, dto: ApproveContentDto): Observable<ObjectDto> {
    return this.http.post<ObjectDto>(`${this.url}/${id}/approve`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Content creator requests removal of an approved object (manager review). */
  requestDeletion(id: number, reason?: string): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/deletion-request`, {
      reason: reason || undefined
    });
  }

  private toUniqueOptions(values: Array<string | undefined>, mapLabel: (value: string) => string): FilterOption[] {
    const unique = values
      .map((value) => value?.trim())
      .filter((value): value is string => !!value)
      .filter((value, index, all) => all.findIndex((x) => x.toLowerCase() === value.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b));

    return unique.map((value) => ({
      value,
      label: mapLabel(value)
    }));
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
