import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface EventDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  distanceMeters?: number;
  startDate: string;
  endDate: string;
  price?: number;
  maxVisitors?: number;
  isActive: boolean;
  status: string;
  eventTypeId: number;
  eventTypeName: string;
  localityName?: string;
  destinationName?: string;
  objectId?: number;
  objectName?: string;
  images?: EventImageDto[];
}

export interface EventImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface NearbyEventQueryParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
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

@Injectable({ providedIn: 'root' })
export class EventService {
  private url = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.url}/${id}`);
  }

  getAll(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(this.url);
  }

  getNearby(query: NearbyEventQueryParams): Observable<PagedEventResultDto<EventDto>> {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PagedEventResultDto<EventDto>>(`${this.url}/nearby`, { params });
  }
}
