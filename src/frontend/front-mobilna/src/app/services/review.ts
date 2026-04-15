import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ReviewDto {
  id: number;
  userId: number;
  userFullName: string;
  objectId: number;
  objectName?: string;
  rating: number;
  text: string;
  creatorResponse?: string;
  creatorResponseAt?: string;
  status: string;
  createdAt: string;
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
  getAll(): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(this.baseUrl);
  }

  // Jedna recenzija po ID
  getById(id: number): Observable<ReviewDto> {
    return this.http.get<ReviewDto>(`${this.baseUrl}/${id}`);
  }

  // Kreiranje nove recenzije (samo Tourist)
  create(dto: any): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(this.baseUrl, dto);
  }
}