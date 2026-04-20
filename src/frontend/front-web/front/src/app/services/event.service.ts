import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7047/api/events';
  private readonly objectsApiUrl = 'https://localhost:7047/api/objects';

  /**
   * Get all events with optional filtering and pagination
   */
  getAll(query?: EventQueryDto): Observable<EventQueryResponse> {
    let params = new HttpParams();

    if (query) {
      if (query.type) params = params.set('type', query.type);
      if (query.destination) params = params.set('destination', query.destination);
      if (query.page) params = params.set('page', query.page.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
      if (query.search) params = params.set('search', query.search);
      if (query.sortBy) params = params.set('sortBy', query.sortBy);
      if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
      if (query.date) params = params.set('date', new Date(query.date).toISOString());
      if (query.nextDays) params = params.set('nextDays', query.nextDays.toString());
      if (query.startDate) params = params.set('startDate', new Date(query.startDate).toISOString());
      if (query.endDate) params = params.set('endDate', new Date(query.endDate).toISOString());
    }

    return this.http.get<EventQueryResponse>(this.apiUrl, { params });
  }

  /**
   * Get events visible to the current manager
   */
  getForManager(query?: EventQueryDto): Observable<EventQueryResponse> {
    let params = new HttpParams();

    if (query) {
      if (query.type) params = params.set('type', query.type);
      if (query.destination) params = params.set('destination', query.destination);
      if (query.page) params = params.set('page', query.page.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
      if (query.search) params = params.set('search', query.search);
      if (query.sortBy) params = params.set('sortBy', query.sortBy);
      if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
      if (query.date) params = params.set('date', new Date(query.date).toISOString());
      if (query.nextDays) params = params.set('nextDays', query.nextDays.toString());
      if (query.startDate) params = params.set('startDate', new Date(query.startDate).toISOString());
      if (query.endDate) params = params.set('endDate', new Date(query.endDate).toISOString());
    }

    return this.http.get<EventQueryResponse>(`${this.apiUrl}/manager`, { params });
  }

  /**
   * Get events created by the current content creator
   */
  getMy(query?: EventQueryDto): Observable<EventQueryResponse> {
    let params = new HttpParams();

    if (query) {
      if (query.type) params = params.set('type', query.type);
      if (query.destination) params = params.set('destination', query.destination);
      if (query.page) params = params.set('page', query.page.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
      if (query.search) params = params.set('search', query.search);
      if (query.sortBy) params = params.set('sortBy', query.sortBy);
      if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
      if (query.date) params = params.set('date', new Date(query.date).toISOString());
      if (query.nextDays) params = params.set('nextDays', query.nextDays.toString());
      if (query.startDate) params = params.set('startDate', new Date(query.startDate).toISOString());
      if (query.endDate) params = params.set('endDate', new Date(query.endDate).toISOString());
    }

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
}
