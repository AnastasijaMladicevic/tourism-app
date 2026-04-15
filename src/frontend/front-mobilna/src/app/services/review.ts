import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private url = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(this.url);
  }
}
