import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface EventPlannerDto {
  id: number;
  userId: number;
  eventId: number;
  eventName: string;
  startDate: string;
  endDate?: string | null;
  eventTypeId: number;
  eventTypeName: string;
  localityId?: number | null;
  localityName?: string | null;
  destinationId?: number | null;
  destinationName?: string | null;
  objectId?: number | null;
  objectName?: string | null;
  isActive: boolean;
  status: string;
  addedAt: string;
}

export interface CreateEventPlannerDto {
  eventId: number;
}

export interface EventPlannerQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  destination?: string;
  locality?: string;
  eventType?: string;
  status?: string;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PagedEventPlannerResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class EventPlannerService {
  private readonly url = `${environment.apiUrl}/event-planner`;

  constructor(private readonly http: HttpClient) {}

  getMyPlanner(
    query?: EventPlannerQueryDto,
  ): Observable<PagedEventPlannerResultDto<EventPlannerDto>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<PagedEventPlannerResultDto<EventPlannerDto>>(this.url, { params });
  }

  add(dto: CreateEventPlannerDto): Observable<EventPlannerDto> {
    return this.http.post<EventPlannerDto>(this.url, dto);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
