import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { DataCacheService } from './data-cache';

export interface ImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
  destinationId?: number | null;
  eventId?: number | null;
  objectId?: number | null;
}

const IMAGE_TTL = 10 * 60 * 1000; // 10 minuta

@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);
  private readonly apiUrl = `${environment.apiUrl}/images`;

  private getCached<T>(key: string, url: string): Observable<T> {
    const cached = this.cache.get<T>(key);
    if (cached !== null) return of(cached);
    return this.http.get<T>(url).pipe(
      tap(data => this.cache.set(key, data, IMAGE_TTL)),
    );
  }

  // === EVENT IMAGES ===
  getForEvent(eventId: number): Observable<ImageDto[]> {
    return this.getCached(`img:event:${eventId}`, `${environment.apiUrl}/events/${eventId}/images`);
  }

  getMainForEvent(eventId: number): Observable<ImageDto> {
    return this.getCached(`img:event:main:${eventId}`, `${environment.apiUrl}/events/${eventId}/images/main`);
  }

  // === DESTINATION IMAGES ===
  getForDestination(destinationId: number): Observable<ImageDto[]> {
    return this.getCached(`img:dest:${destinationId}`, `${environment.apiUrl}/destinations/${destinationId}/images`);
  }

  getMainForDestination(destinationId: number): Observable<ImageDto> {
    return this.getCached(`img:dest:main:${destinationId}`, `${environment.apiUrl}/destinations/${destinationId}/images/main`);
  }

  // === OBJECT IMAGES ===
  getForObject(objectId: number): Observable<ImageDto[]> {
    return this.getCached(`img:obj:${objectId}`, `${environment.apiUrl}/objects/${objectId}/images`);
  }

  getMainForObject(objectId: number): Observable<ImageDto> {
    return this.getCached(`img:obj:main:${objectId}`, `${environment.apiUrl}/objects/${objectId}/images/main`);
  }

  // === LOCALITY IMAGES ===
  getForLocality(localityId: number): Observable<ImageDto[]> {
    return this.getCached(`img:loc:${localityId}`, `${environment.apiUrl}/localities/${localityId}/images`);
  }

  getMainForLocality(localityId: number): Observable<ImageDto> {
    return this.getCached(`img:loc:main:${localityId}`, `${environment.apiUrl}/localities/${localityId}/images/main`);
  }

  // === ACTIVITY IMAGES ===
  getForActivity(activityId: number): Observable<ImageDto[]> {
    return this.getCached(`img:act:${activityId}`, `${environment.apiUrl}/activities/${activityId}/images`);
  }

  getMainForActivity(activityId: number): Observable<ImageDto> {
    return this.getCached(`img:act:main:${activityId}`, `${environment.apiUrl}/activities/${activityId}/images/main`);
  }

  // === REVIEW IMAGES ===
  getForReview(reviewId: number): Observable<ImageDto[]> {
    return this.getCached(`img:review:${reviewId}`, `${environment.apiUrl}/reviews/${reviewId}/images`);
  }

  getAll(): Observable<ImageDto[]> {
    return this.http.get<ImageDto[]>(this.apiUrl);
  }

  uploadReviewImages(reviewId: number, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('Files', file));
    return this.http.post(`${environment.apiUrl}/reviews/${reviewId}/images`, formData);
  }

  deleteReviewImage(reviewId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/reviews/${reviewId}/images/${imageId}`);
  }

  invalidateReviewImages(reviewId: number): void {
    this.cache.invalidatePrefix(`img:review:${reviewId}`);
  }
}
