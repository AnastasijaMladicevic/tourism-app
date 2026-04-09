import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ImageDto {
  id: number;
  url: string;
  isMain: boolean;
  destinationId?: number | null;
  eventId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ImageService {
  private apiUrl = `${environment.apiUrl}/images`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ImageDto[]> {
    return this.http.get<ImageDto[]>(this.apiUrl);
  }
}
