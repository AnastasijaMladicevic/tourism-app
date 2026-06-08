import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { ReviewDto } from './review';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { ApproveContentDto } from '../models/event.model';
import { normalizeEntityMedia, normalizeMediaRow, normalizeMediaRows } from '../shared/utils/media-url';
import { TranslationService } from './translation.service';

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
  approvedAt?: string;
  approvedByUserId?: number;
  rejectionReason?: string;
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
    private readonly translationService: TranslationService,
  ) {}

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }

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

    params = this.addLang(params, options);
    return this.http.get<ObjectDto[]>(this.url, { params }).pipe(
      map((items) => (items ?? []).map((item) => this.normalizeObject(item)))
    );
  }

  getById(id: number): Observable<ObjectDto> {
    const params = this.addLang(new HttpParams());
    return this.http.get<ObjectDto>(`${this.url}/${id}`, { params }).pipe(
      map((item) => this.normalizeObject(item))
    );
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

    params = this.addLang(params, options);
    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/nearby`, { params }).pipe(
      map((response) => this.normalizePagedObjects(response))
    );
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

    params = this.addLang(params, options);
    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/my`, { params }).pipe(
      map((response) => this.normalizePagedObjects(response))
    );
  }

  /** Objects assigned to the signed-in manager's destinations (server-scoped; do not apply client region filter). */
  getForManager(query?: ObjectQueryParams, options?: RegionRequestOptions): Observable<PagedResultDto<ObjectDto>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    params = this.addLang(params, options);
    return this.http.get<PagedResultDto<ObjectDto>>(`${this.url}/manager`, { params }).pipe(
      map((response) => this.normalizePagedObjects(response))
    );
  }

  getManagerFilterOptions(): Observable<{ typeOptions: FilterOption[]; statusOptions: FilterOption[] }> {
    const query = { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' };
    return forkJoin([
      this.getForManager(query),
      this.getForManager(query, { bypassLanguage: true })
    ]).pipe(
      map(([translatedResponse, originalResponse]) => {
        const translatedItems = translatedResponse?.items ?? [];
        const originalItems = originalResponse?.items ?? [];

        const originalNameById = new Map<number, string>();
        for (const item of originalItems) {
          if (item.objectTypeId && !originalNameById.has(item.objectTypeId)) {
            originalNameById.set(item.objectTypeId, item.objectTypeName);
          }
        }

        const typeOptionMap = new Map<number, FilterOption>();
        for (const item of translatedItems) {
          if (item.objectTypeId && !typeOptionMap.has(item.objectTypeId)) {
            typeOptionMap.set(item.objectTypeId, {
              value: originalNameById.get(item.objectTypeId) || item.objectTypeName,
              label: item.objectTypeName
            });
          }
        }
        const typeOptions = Array.from(typeOptionMap.values())
          .sort((a, b) => a.label.localeCompare(b.label));

        const statusOptions = this.toUniqueOptions(
          translatedItems.map((item) => item.status),
          (value) => this.toTitleCase(value ?? '')
        );

        return { typeOptions, statusOptions };
      })
    );
  }

  getMyFilterOptions(): Observable<{ typeOptions: FilterOption[]; statusOptions: FilterOption[] }> {
    const query = { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' };
    return forkJoin([
      this.getMy(query, { bypassRegion: true }),
      this.getMy(query, { bypassRegion: true, bypassLanguage: true })
    ]).pipe(
      map(([translatedResponse, originalResponse]) => {
        const translatedItems = translatedResponse?.items ?? [];
        const originalItems = originalResponse?.items ?? [];

        const originalNameById = new Map<number, string>();
        for (const item of originalItems) {
          if (item.objectTypeId && !originalNameById.has(item.objectTypeId)) {
            originalNameById.set(item.objectTypeId, item.objectTypeName);
          }
        }

        const typeOptionMap = new Map<number, FilterOption>();
        for (const item of translatedItems) {
          if (item.objectTypeId && !typeOptionMap.has(item.objectTypeId)) {
            typeOptionMap.set(item.objectTypeId, {
              value: originalNameById.get(item.objectTypeId) || item.objectTypeName,
              label: item.objectTypeName
            });
          }
        }
        const typeOptions = Array.from(typeOptionMap.values())
          .sort((a, b) => a.label.localeCompare(b.label));

        const statusOptions = this.toUniqueOptions(
          translatedItems.map((item) => item.status),
          (value) => this.toTitleCase(value)
        );

        return { typeOptions, statusOptions };
      })
    );
  }

  getObjectTypeOptions(): Observable<ObjectTypeOption[]> {
    const baseParams = new HttpParams()
      .set('page', '1')
      .set('pageSize', '500')
      .set('sortBy', 'objectTypeName')
      .set('sortOrder', 'asc');

    const extractItems = (resp: PagedResultDto<ObjectDto> | ObjectDto[]): ObjectDto[] =>
      Array.isArray(resp) ? resp : (resp as PagedResultDto<ObjectDto>)?.items ?? [];

    return forkJoin([
      this.http.get<PagedResultDto<ObjectDto> | ObjectDto[]>(this.url, { params: this.addLang(baseParams) }),
      this.http.get<PagedResultDto<ObjectDto> | ObjectDto[]>(this.url, { params: baseParams })
    ]).pipe(
      map(([translatedResp, originalResp]) => {
        const translatedItems = extractItems(translatedResp);
        const originalItems = extractItems(originalResp);

        const originalNameById = new Map<number, string>();
        for (const item of originalItems) {
          if (item.objectTypeId && !originalNameById.has(item.objectTypeId)) {
            originalNameById.set(item.objectTypeId, item.objectTypeName);
          }
        }

        const unique = new Map<number, ObjectTypeOption>();
        for (const item of translatedItems) {
          if (!item.objectTypeId || unique.has(item.objectTypeId)) continue;
          unique.set(item.objectTypeId, {
            id: item.objectTypeId,
            name: item.objectTypeName || originalNameById.get(item.objectTypeId) || `Type #${item.objectTypeId}`
          });
        }

        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  create(dto: CreateObjectDto): Observable<ObjectDto> {
    return this.http.post<ObjectDto>(this.url, dto).pipe(
      map((item) => this.normalizeObject(item))
    );
  }

  addImage(objectId: number, file: File, isMain = false, altText?: string): Observable<ObjectImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    if (altText?.trim()) {
      formData.append('altText', altText.trim());
    }

    return this.http.post<ObjectImageDto>(`${this.url}/${objectId}/images`, formData).pipe(
      map((image) => normalizeMediaRow(image))
    );
  }

  /** Lists images linked to a tourist object (same payload as `ObjectDto.images` when populated). */
  getImages(objectId: number): Observable<ObjectImageDto[]> {
    return this.http.get<ObjectImageDto[]>(`${this.url}/${objectId}/images`).pipe(
      map((images) => normalizeMediaRows(images))
    );
  }

  /** Deletes a stored image row by global image id (`api/images/{id}`). */
  deleteImageById(imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/images/${imageId}`);
  }

  /** Marks an image as the main image for its entity. */
  setMainImage(imageId: number): Observable<ObjectImageDto> {
    return this.http.patch<ObjectImageDto>(`${environment.apiUrl}/images/${imageId}/set-main`, {}).pipe(
      map((image) => normalizeMediaRow(image))
    );
  }

  update(id: number, dto: UpdateObjectDto): Observable<ObjectDto> {
    return this.http.put<ObjectDto>(`${this.url}/${id}`, dto).pipe(
      map((item) => this.normalizeObject(item))
    );
  }

  approve(id: number, dto: ApproveContentDto): Observable<ObjectDto> {
    return this.http.post<ObjectDto>(`${this.url}/${id}/approve`, dto).pipe(
      map((item) => this.normalizeObject(item))
    );
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

  private normalizeObject(item: ObjectDto): ObjectDto {
    return normalizeEntityMedia({
      ...item,
      status: this.resolveObjectStatus(item)
    });
  }

  private resolveObjectStatus(item: ObjectDto & { Status?: string | number }): string | undefined {
    const raw = item.status ?? item.Status;
    if (raw == null || raw === '') {
      if (item.approvedAt) {
        return 'Approved';
      }
      if (item.rejectionReason?.trim()) {
        return 'Rejected';
      }
      return item.status;
    }

    if (typeof raw === 'number') {
      switch (raw) {
        case 1:
          return 'Approved';
        case 2:
          return 'Rejected';
        default:
          return 'Pending';
      }
    }

    const text = String(raw).trim();
    if (!text) {
      if (item.approvedAt) {
        return 'Approved';
      }
      if (item.rejectionReason?.trim()) {
        return 'Rejected';
      }
      return undefined;
    }

    if (/^\d+$/.test(text)) {
      switch (Number(text)) {
        case 1:
          return 'Approved';
        case 2:
          return 'Rejected';
        default:
          return 'Pending';
      }
    }

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  private normalizePagedObjects(response: PagedResultDto<ObjectDto>): PagedResultDto<ObjectDto> {
    return {
      ...response,
      items: (response?.items ?? []).map((item) => this.normalizeObject(item))
    };
  }
}
