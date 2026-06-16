import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface RegionDto {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  defaultMapZoom?: number | null;
  isDefault: boolean;
  isActive: boolean;
  boundaryGeoJson?: string;
}

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly url = `${environment.apiUrl}/Regions`;

  constructor(private readonly http: HttpClient) {}

  getAll(includeInactive = false): Observable<RegionDto[]> {
    return this.http.get<RegionDto[]>(this.url, {
      params: { includeInactive },
    });
  }

  getDefault(): Observable<RegionDto> {
    return this.http.get<RegionDto>(`${this.url}/default`);
  }

  getById(id: number): Observable<RegionDto> {
    return this.http.get<RegionDto>(`${this.url}/${id}`);
  }
}
