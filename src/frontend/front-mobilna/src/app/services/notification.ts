import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationUnreadCountDto {
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly api = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) { }

  getMy(page = 1, pageSize = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get(this.api, { params });
  }

  getUnreadCount(): Observable<NotificationUnreadCountDto> {
    return this.http.get<NotificationUnreadCountDto>(
      `${this.api}/unread-count`
    );
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.api}/${id}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(
      `${this.api}/read-all`,
      {}
    );
  }
}