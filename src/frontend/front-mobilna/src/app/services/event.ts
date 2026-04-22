import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface EventDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
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

@Injectable({ providedIn: 'root' })
export class EventService {
  private url = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.url}/${id}`);
  }

  // za listu festivala kasnije
  getAll(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(this.url);
  }
}
