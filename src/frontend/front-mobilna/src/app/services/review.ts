import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ReviewDto {
  id: number;
  userId: number;
  userFullName: string;
  objectId: number;
  objectName: string;
  rating: number;
  text: string;
  creatorResponse?: string | null;
  creatorResponseAt?: string | null;
  status: string;
  reviewedByUserId?: number | null;
  reviewedByFullName?: string | null;
  createdAt: string;
}

export interface ReviewQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {

  private baseUrl = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  // Sve recenzije za određeni objekat
  getForObject(objectId: number): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.baseUrl}/object/${objectId}`);
  }

  // Sve recenzije (za "See All" stranicu)
  getAll(query?: ReviewQueryParams): Observable<ReviewDto[]> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<ReviewDto[]>(this.baseUrl, { params });
  }

  // Jedna recenzija po ID
  getById(id: number): Observable<ReviewDto> {
    return this.http.get<ReviewDto>(`${this.baseUrl}/${id}`);
  }

  // Kreiranje nove recenzije (samo Tourist)
  create(dto: any): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(this.baseUrl, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
