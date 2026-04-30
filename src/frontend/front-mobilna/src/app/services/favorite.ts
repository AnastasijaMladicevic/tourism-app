import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface FavoriteDto {
  id: number;
  userId: number;
  destinationId?: number;
  destinationName?: string;
  objectId?: number;
  objectName?: string;
  activityId?: number;
  activityName?: string;
  routeId?: number;
  routeName?: string;
  localityId?: number;
  localityName?: string;
  createdAt: string;
}

export interface CreateFavoriteDto {
  destinationId?: number;
  objectId?: number;
  activityId?: number;
  routeId?: number;
  localityId?: number;
}

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private url = `${environment.apiUrl}/favorites`;

  constructor(private http: HttpClient) {}

  // GET /api/favorites — vraća sve favorite ulogovanog korisnika
  getMyFavorites(): Observable<FavoriteDto[]> {
    return this.http
      .get<
        | FavoriteDto[]
        | {
            items?: FavoriteDto[];
            Items?: FavoriteDto[];
            data?: FavoriteDto[];
            Data?: FavoriteDto[];
            results?: FavoriteDto[];
            Results?: FavoriteDto[];
            value?: FavoriteDto[];
            Value?: FavoriteDto[];
          }
      >(this.url)
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          if (Array.isArray(response?.items)) {
            return response.items;
          }

          if (Array.isArray(response?.Items)) {
            return response.Items;
          }

          if (Array.isArray(response?.data)) {
            return response.data;
          }

          if (Array.isArray(response?.Data)) {
            return response.Data;
          }

          if (Array.isArray(response?.results)) {
            return response.results;
          }

          if (Array.isArray(response?.Results)) {
            return response.Results;
          }

          if (Array.isArray(response?.value)) {
            return response.value;
          }

          if (Array.isArray(response?.Value)) {
            return response.Value;
          }

          return [];
        }),
      );
  }

  // POST /api/favorites
  // Primer za destinaciju: add({ destinationId: 5 })
  add(dto: CreateFavoriteDto): Observable<FavoriteDto> {
    return this.http.post<FavoriteDto>(this.url, dto);
  }

  // DELETE /api/favorites/{id}
  remove(favoriteId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${favoriteId}`);
  }
}
