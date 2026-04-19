import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ReviewDto } from './review';

export interface ObjectImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface ObjectDto {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  workingHours?: string;
  longitude?: number;
  latitude?: number;
  averageRating?: number;
  reviewCount?: number;
  distanceKm?: number;
  isActive: boolean;
  objectTypeId: number;
  objectTypeName: string;
  localityName?: string;
  destinationName?: string;
  images?: ObjectImageDto[];
  reviews?: ReviewDto[];
}
export interface ObjectView extends ObjectDto {
  isFavorite: boolean;
  favoriteId?: number;
}

@Injectable({ providedIn: 'root' })
export class ObjectService {
  private url = `${environment.apiUrl}/objects`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ObjectDto[]> {
    return this.http.get<ObjectDto[]>(this.url);
  }

  getById(id: number): Observable<ObjectDto> {
    return this.http.get<ObjectDto>(`${this.url}/${id}`);
  }

  // ako kasnije budeš filtrirao po tipu na backendu
  getByType(typeName: string): Observable<ObjectDto[]> {
    return this.http.get<ObjectDto[]>(`${this.url}?type=${typeName}`);
  }
}
