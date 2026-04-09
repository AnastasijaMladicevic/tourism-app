import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
  eventId?: number;
}

@Injectable({ providedIn: 'root' })
export class ImageService {

  constructor(private http: HttpClient) {}

  // === EVENT IMAGES ===
  getForEvent(eventId: number): Observable<ImageDto[]> {
    return this.http.get<ImageDto[]>(`${environment.apiUrl}/events/${eventId}/images`);
  }

  getMainForEvent(eventId: number): Observable<ImageDto> {
    return this.http.get<ImageDto>(`${environment.apiUrl}/events/${eventId}/images/main`);
  }
  // === DESTINATION IMAGES ===
  getForDestination(destinationId: number): Observable<ImageDto[]> {
    return this.http.get<ImageDto[]>(`${environment.apiUrl}/destinations/${destinationId}/images`);
  }

  getMainForDestination(destinationId: number): Observable<ImageDto> {
    return this.http.get<ImageDto>(`${environment.apiUrl}/destinations/${destinationId}/images/main`);
  }
}