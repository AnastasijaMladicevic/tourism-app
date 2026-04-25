import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService } from './active-region';

export interface RecommendationItemDto {
  itemType: string;
  itemId: number;
  title: string;
  location: string;
  categoryName: string;
  imageUrl?: string;
  averageRating?: number | null;
  reviewCount: number;
  price?: number | null;
  durationMinutes?: number | null;
  distanceMeters?: number | null;
  score: number;
}

export interface RecommendationQueryParams {
  pageSize?: number;
  regionId?: number;
  latitude?: number;
  longitude?: number;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly url = `${environment.apiUrl}/recommendations/home`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  getHomeRecommendations(query?: RecommendationQueryParams): Observable<RecommendationItemDto[]> {
    const effectiveQuery = this.activeRegionService.applySelectedRegion(query);
    let params = new HttpParams();

    if (effectiveQuery) {
      Object.entries(effectiveQuery).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<RecommendationItemDto[]>(this.url, { params });
  }
}
