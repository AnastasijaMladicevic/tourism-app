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
  EventTicketTypeDto,
  TouristObjectQueryResponse,
  TouristObjectQueryDto
} from '../models/event.model';
import { environment } from '../../environment/environment';
import { ActiveRegionService, RegionRequestOptions } from './active-region';
import { normalizeEntityMedia, normalizeMediaRow, normalizeMediaRows } from '../shared/utils/media-url';
import { TranslationService } from './translation.service';
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
    private readonly translationService: TranslationService,
  ) {}

  private addLang(params: HttpParams, options?: RegionRequestOptions): HttpParams {
    if (options?.bypassLanguage) {
      return params;
    }

    return params.set('Lang', this.translationService.language());
  }
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

    params = this.addLang(params, options);
    return this.http.get<PagedEventResultDto<EventDto>>(`${this.url}/nearby`, { params }).pipe(
      map((response) => this.normalizePagedEvents(response))
    );
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

    params = this.addLang(params, options);
    return this.http.get<{ items: EventDto[] }>(this.url, { params }).pipe(
      map(response => {
        const items = Array.isArray(response) ? response : (response?.items ?? []);
        return items.map((event) => this.normalizeEvent(event));
      })
    );
  }

  /**
   * Get events visible to the current manager
   */
  getForManager(query?: EventQueryDto): Observable<EventQueryResponse> {
    const params = this.addLang(this.buildEventQueryParams(query));
    return this.http.get<EventQueryResponse>(`${this.apiUrl}/manager`, { params }).pipe(
      map((response) => this.normalizeEventResponse(response))
    );
  }

  /**
   * Get events created by the current content creator
   */
  getMy(query?: EventQueryDto): Observable<EventQueryResponse> {
    const params = this.addLang(this.buildEventQueryParams(query));
    return this.http.get<EventQueryResponse>(`${this.apiUrl}/my`, { params }).pipe(
      map((response) => this.normalizeEventResponse(response))
    );
  }

  /**
   * Get event by ID
   */
  getById(id: number): Observable<EventDto> {
    const params = this.addLang(new HttpParams());
    return this.http.get<EventDto>(`${this.apiUrl}/${id}`, { params }).pipe(
      map((event) => this.normalizeEvent(event))
    );
  }

  /**
   * Get event by ID only if it belongs to current content creator
   */
  getMyById(id: number): Observable<EventDto> {
    const params = this.addLang(new HttpParams());
    return this.http.get<EventDto>(`${this.apiUrl}/${id}`, { params }).pipe(
      map((event) => this.normalizeEvent(event))
    );
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

    return this.http.get<TouristObjectQueryResponse>(this.objectsApiUrl, { params: this.addLang(params) });
  }

  /**
   * Create new event
   */
  create(dto: CreateEventDto): Observable<EventDto> {
    return this.http.post<EventDto>(this.apiUrl, dto).pipe(
      map((event) => this.normalizeEvent(event))
    );
  }

  /**
   * Update existing event
   */
  update(id: number, dto: UpdateEventDto): Observable<EventDto> {
    return this.http.put<EventDto>(`${this.apiUrl}/${id}`, dto).pipe(
      map((event) => this.normalizeEvent(event))
    );
  }

  /**
   * Approve or decline event as manager
   */
  approve(id: number, dto: ApproveContentDto): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.apiUrl}/${id}/approve`, dto).pipe(
      map((event) => this.normalizeEvent(event))
    );
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
    return this.http.post<EventImageDto>(`${this.apiUrl}/${eventId}/images`, dto).pipe(
      map((image) => normalizeMediaRow(image))
    );
  }

  uploadImage(eventId: number, file: File, isMain = false, altText?: string): Observable<EventImageDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', String(isMain));
    if (altText?.trim()) {
      formData.append('altText', altText.trim());
    }

    return this.http.post<EventImageDto>(`${this.apiUrl}/${eventId}/images`, formData).pipe(
      map((image) => normalizeMediaRow(image))
    );
  }

  getImages(eventId: number): Observable<EventImageDto[]> {
    return this.http.get<EventImageDto[]>(`${this.apiUrl}/${eventId}/images`).pipe(
      map((images) => normalizeMediaRows(images))
    );
  }

  deleteImageById(imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/images/${imageId}`);
  }

  setMainImage(imageId: number): Observable<EventImageDto> {
    return this.http.patch<EventImageDto>(`${environment.apiUrl}/images/${imageId}/set-main`, {}).pipe(
      map((image) => normalizeMediaRow(image))
    );
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

  private normalizeEvent(event: EventDto): EventDto {
    return {
      ...normalizeEntityMedia(event),
      ticketTypes: (event.ticketTypes ?? []).map((ticketType) => this.normalizeTicketType(ticketType))
    };
  }

  private normalizeTicketType(ticketType: EventTicketTypeDto): EventTicketTypeDto {
    return {
      ...ticketType,
      price: Number(ticketType.price ?? 0),
      sortOrder: Number(ticketType.sortOrder ?? 0)
    };
  }

  private normalizeEventResponse(response: EventQueryResponse): EventQueryResponse {
    return {
      ...response,
      items: (response?.items ?? []).map((event) => this.normalizeEvent(event))
    };
  }

  private normalizePagedEvents(response: PagedEventResultDto<EventDto>): PagedEventResultDto<EventDto> {
    return {
      ...response,
      items: (response?.items ?? []).map((event) => this.normalizeEvent(event))
    };
  }
}
