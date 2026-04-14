import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
  destinationId?: number | null;
  eventId?: number | null;
  objectId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ImageService {

  private apiUrl = `${environment.apiUrl}/images`;

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

  // === OBJECT IMAGES ===
  getForObject(objectId: number): Observable<ImageDto[]> {
    return this.http.get<ImageDto[]>(`${environment.apiUrl}/objects/${objectId}/images`);
  }

  getMainForObject(objectId: number): Observable<ImageDto> {
    return this.http.get<ImageDto>(`${environment.apiUrl}/objects/${objectId}/images/main`);
  }

  getAll(): Observable<ImageDto[]> {
    return this.http.get<ImageDto[]>(this.apiUrl);
  }
}
