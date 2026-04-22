import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface DestinationDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number; // backend će ovo dodati kad implementiraš lat/lng filter
  averageRating?: number;
  reviewCount?: number;
  isActive: boolean;
  destinationTypeId: number;
  destinationTypeName: string;
  images: DestinationImageDto[];
  isFavorite?: boolean; // frontend resolves ovo upoređivanjem sa favorites listom
  favoriteId?: number;
}

export interface DestinationImageDto {
  id: number;
  url: string;
  altText?: string;
  isMain: boolean;
}

export interface CreateDestinationDto {
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  destinationTypeId: number;
}

export interface UpdateDestinationDto {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  destinationTypeId?: number;
}

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private url = `${environment.apiUrl}/Destinations`;

  constructor(private http: HttpClient) {}

  // GET /api/destinations
  // Kad backend doda lat/lng podršku, dodaćeš params ovde
  getAll(): Observable<DestinationDto[]> {
    return this.http.get<DestinationDto[]>(this.url);
  }

  // GET /api/destinations/{id}
  getById(id: number): Observable<DestinationDto> {
    return this.http.get<DestinationDto>(`${this.url}/${id}`);
  }

  // POST /api/destinations — samo Admin
  create(dto: CreateDestinationDto): Observable<DestinationDto> {
    return this.http.post<DestinationDto>(this.url, dto);
  }

  // PUT /api/destinations/{id} — samo Admin
  update(id: number, dto: UpdateDestinationDto): Observable<DestinationDto> {
    return this.http.put<DestinationDto>(`${this.url}/${id}`, dto);
  }

  // DELETE /api/destinations/{id} — samo Admin
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
