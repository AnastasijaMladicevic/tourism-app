import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { AuthService } from './auth';
import { NotificationPreferencesService } from './notification-preferences';

export interface NotificationDto {
  id: number;
  type?: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  eventId?: number | null;
  reviewId?: number | null;
  eventPlannerItemId?: number | null;
  triggerAtUtc?: string | null;
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
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/hubs/notifications`;
  private hubConnection?: signalR.HubConnection;
  private readonly liveNotificationSubject = new Subject<NotificationDto>();
  private readonly liveBannerSubject = new Subject<NotificationDto>();
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  readonly liveNotification$ = this.liveNotificationSubject.asObservable();
  readonly liveBanner$ = this.liveBannerSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  getUnreadCountSnapshot(): number {
    return this.unreadCountSubject.value;
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationPreferencesService: NotificationPreferencesService,
    private ngZone: NgZone,
  ) { }

  startLiveConnection(): void {
    const token = this.authService.getToken();
    if (!token || this.hubConnection) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.authService.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('notificationReceived', (notification: NotificationDto) => {
      this.ngZone.run(() => {
        if (!this.notificationPreferencesService.shouldSurfaceNotification(notification.type)) {
          return;
        }

        if (!notification.isRead) {
          this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
        }

        this.liveNotificationSubject.next(notification);

        if (this.notificationPreferencesService.shouldShowBanner(notification.type)) {
          this.liveBannerSubject.next(notification);
        }
      });
    });

    this.hubConnection
      .start()
      .catch(() => {
        this.hubConnection = undefined;
      });
  }

  stopLiveConnection(): void {
    if (!this.hubConnection) {
      return;
    }

    const connection = this.hubConnection;
    this.hubConnection = undefined;
    connection.stop();
  }

  getMy(page = 1, pageSize = 50): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<any>(this.api, { params });
  }

  getUnreadCount(): Observable<NotificationUnreadCountDto> {
    return this.http.get<NotificationUnreadCountDto>(
      `${this.api}/unread-count`
    ).pipe(
      tap((res) => this.unreadCountSubject.next(res.unreadCount ?? 0)),
    );
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(
      `${this.api}/${id}/read`,
      {}
    ).pipe(
      tap(() => this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1)))
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(
      `${this.api}/read-all`,
      {}
    ).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  refreshUnreadCount(): Observable<NotificationUnreadCountDto> {
    return this.getUnreadCount();
  }

  resetUnreadCount(): void {
    this.unreadCountSubject.next(0);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  deleteAllRead(): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(`${this.api}/read`);
  }
}
