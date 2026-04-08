import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
@Injectable({ providedIn: 'root' })
export class ImageService {
  private apiUrl = `${environment.apiUrl}/image`;

  constructor(private http: HttpClient) {}

  getAll() { return this.http.get<any[]>(this.apiUrl); }
}