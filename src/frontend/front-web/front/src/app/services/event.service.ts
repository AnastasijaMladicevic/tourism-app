import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { from, map, Observable, of } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import {
  EventDto,
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  EventQueryResponse,
  ApproveContentDto,
  EventType,
  TouristObjectQueryResponse,
  TouristObjectQueryDto
} from '../models/event.model';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
export interface EventImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface AddEventImageDto {
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface EventQueryParams {
  type?: string;
  destination?: string;
  status?: string;
  regionId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  date?: string;
  nextDays?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface NearbyEventQueryParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  regionId?: number;
  type?: string;
  destination?: string;
  search?: string;
  date?: string;
  nextDays?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: string;
}

export interface PagedEventResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
@Injectable({
  providedIn: 'root'
})
export class EventService {



  private readonly url = `${environment.apiUrl}/events`;

  constructor(
    private readonly activeRegionService: ActiveRegionService,
  ) {}
  getNearby(
    query: NearbyEventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<PagedEventResultDto<EventDto>> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options) ?? query;
    let params = new HttpParams();

    Object.entries(effectiveQuery).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PagedEventResultDto<EventDto>>(`${this.url}/nearby`, { params });
  }


  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/events`;
  private readonly objectsApiUrl = `${environment.apiUrl}/objects`;

  private buildEventQueryParams(query?: EventQueryDto): HttpParams {
    let params = new HttpParams();

    if (!query) {
      return params;
    }

    if (query.type) params = params.set('type', query.type);
    if (query.destination) params = params.set('destination', query.destination);
    if (query.status) params = params.set('status', query.status);
    if (query.page) params = params.set('page', query.page.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.search) params = params.set('search', query.search);
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
    if (query.date) params = params.set('date', new Date(query.date).toISOString());
    if (query.nextDays) params = params.set('nextDays', query.nextDays.toString());
    if (query.startDate) params = params.set('startDate', new Date(query.startDate).toISOString());
    if (query.endDate) params = params.set('endDate', new Date(query.endDate).toISOString());

    return params;
  }

  /**
   * Get all events with optional filtering and pagination
   */
  getAll(
    query?: EventQueryParams,
    options?: RegionRequestOptions,
  ): Observable<EventDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query, options);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<{ items: EventDto[] }>(this.url, { params }).pipe(
      map(response => Array.isArray(response) ? response : (response?.items ?? []))
    );
  }

  /**
   * Get events visible to the current manager
   */
  getForManager(query?: EventQueryDto): Observable<EventQueryResponse> {
    const params = this.buildEventQueryParams(query);
    return this.http.get<EventQueryResponse>(`${this.apiUrl}/manager`, { params });
  }

  /**
   * Get events created by the current content creator
   */
  getMy(query?: EventQueryDto): Observable<EventQueryResponse> {
    const params = this.buildEventQueryParams(query);
    return this.http.get<EventQueryResponse>(`${this.apiUrl}/my`, { params });
  }

  /**
   * Get event by ID
   */
  getById(id: number): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get event by ID only if it belongs to current content creator
   */
  getMyById(id: number): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get event types for dropdown options
   */
  getEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(`${this.apiUrl}/types`);
  }

  /**
   * Get tourist objects for event object dropdown options
   */
  getObjectOptions(query?: TouristObjectQueryDto): Observable<TouristObjectQueryResponse> {
    let params = new HttpParams();

    if (query) {
      if (query.page) params = params.set('page', query.page.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
      if (query.search) params = params.set('search', query.search);
      if (query.sortBy) params = params.set('sortBy', query.sortBy);
      if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
    }

    return this.http.get<TouristObjectQueryResponse>(this.objectsApiUrl, { params });
  }

  /**
   * Create new event
   */
  create(dto: CreateEventDto): Observable<EventDto> {
    return this.http.post<EventDto>(this.apiUrl, dto);
  }

  /**
   * Update existing event
   */
  update(id: number, dto: UpdateEventDto): Observable<EventDto> {
    return this.http.put<EventDto>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Approve or decline event as manager
   */
  approve(id: number, dto: ApproveContentDto): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.apiUrl}/${id}/approve`, dto);
  }

  /**
   * Delete event (if endpoint exists)
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Submit deletion request for approved event
   */
  requestDeletion(id: number, reason?: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/deletion-request`, {
      reason: reason || undefined
    });
  }

  addImage(eventId: number, dto: AddEventImageDto): Observable<EventImageDto> {
    return this.http.post<EventImageDto>(`${this.apiUrl}/${eventId}/images`, dto);
  }

  uploadImage(eventId: number, file: File, isMain = false, altText?: string): Observable<EventImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    if (altText?.trim()) {
      formData.append('altText', altText.trim());
    }

    return this.http.post<EventImageDto>(`${this.apiUrl}/${eventId}/images`, formData);
  }

  getImages(eventId: number): Observable<EventImageDto[]> {
    return this.http.get<EventImageDto[]>(`${this.apiUrl}/${eventId}/images`);
  }

  deleteImageById(imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/images/${imageId}`);
  }

  setMainImage(imageId: number): Observable<EventImageDto> {
    return this.http.patch<EventImageDto>(`${environment.apiUrl}/images/${imageId}/set-main`, {});
  }

  /** Sequential attach after event creation; first URL becomes main. */
  attachImages(eventId: number, imageUrls: string[]): Observable<EventImageDto[]> {
    const cleanUrls = imageUrls.map((u) => u.trim()).filter((u) => u.length > 0);
    if (cleanUrls.length === 0) {
      return of([]);
    }

    return from(cleanUrls).pipe(
      concatMap((url, index) => this.addImage(eventId, { url, isMain: index === 0 })),
      toArray()
    );
  }
}
