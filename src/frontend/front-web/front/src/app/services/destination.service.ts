import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DestinationQueryDto, DestinationQueryResponse } from '../models/destination.model';

@Injectable({
  providedIn: 'root'
})
export class DestinationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7047/api/destinations';

  getAll(query?: DestinationQueryDto): Observable<DestinationQueryResponse> {
    let params = new HttpParams();

    if (query) {
      if (query.type) params = params.set('type', query.type);
      if (query.page) params = params.set('page', query.page.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
      if (query.search) params = params.set('search', query.search);
      if (query.sortBy) params = params.set('sortBy', query.sortBy);
      if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
    }

    return this.http.get<DestinationQueryResponse>(this.apiUrl, { params });
  }
}