import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface EventDto {
  id: number;
  name: string;
  eventTypeName?: string | null;
  startDate: string;
  endDate?: string | null;
  price?: number | null;
  maxVisitors?: number | null;
  isActive: boolean;
  localityName?: string | null;
  destinationName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private url = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(this.url);
  }
}
