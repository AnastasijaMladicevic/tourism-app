import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface DestinationTypeDto {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class DestinationTypeService {

  private url = `${environment.apiUrl}/destination-types`;

  constructor(private http: HttpClient) {}

  // GET /api/destination-types
  getAll(): Observable<DestinationTypeDto[]> {
    return this.http.get<DestinationTypeDto[]>(this.url);
  }
}