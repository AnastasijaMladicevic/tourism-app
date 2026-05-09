import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface QrLinkDto {
  label: string;
  targetUrl: string;
  qrImageUrl: string;
}

export type QrEntityType = 'destinations' | 'localities' | 'events' | 'objects' | 'activities';

@Injectable({
  providedIn: 'root'
})
export class QrLinkService {
  private readonly api = `${environment.apiUrl}/qr-links`;

  constructor(private readonly http: HttpClient) {}

  getForEntity(type: QrEntityType, id: number): Observable<QrLinkDto> {
    return this.http.get<QrLinkDto>(`${this.api}/${type}/${id}`);
  }
}
