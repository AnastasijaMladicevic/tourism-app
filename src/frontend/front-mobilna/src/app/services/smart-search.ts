import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService } from './active-region';

export interface SmartSearchQueryParams {
  query: string;
  pageSize?: number;
  regionId?: number;
  latitude?: number;
  longitude?: number;
}

export interface SmartSearchResultDto {
  id: number;
  name: string;
  typeName: string;
  location: string;
  category: 'destination' | 'object' | 'event';
  markerType: string;
  icon: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  matchReason: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class SmartSearchService {
  private readonly url = `${environment.apiUrl}/search/smart`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  search(query: SmartSearchQueryParams): Observable<SmartSearchResultDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query);
    let params = new HttpParams();

    Object.entries(effectiveQuery ?? query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<SmartSearchResultDto[]>(this.url, { params });
  }
}
