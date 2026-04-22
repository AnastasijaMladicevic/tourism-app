import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface LocalityDto {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  longitude?: number;
  latitude?: number;
  isActive: boolean;
  distanceMeters?: number;
  destinationId: number;
  destinationName: string;
  localityTypeId: number;
  localityTypeName: string;
  createdByUserId?: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LocalityService {
  private url = `${environment.apiUrl}/Localities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<LocalityDto[]> {
    return this.http.get<LocalityDto[]>(this.url);
  }

  getById(id: number): Observable<LocalityDto> {
    return this.http.get<LocalityDto>(`${this.url}/${id}`);
  }
}
