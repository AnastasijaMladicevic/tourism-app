import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, map, Observable, Subject, tap } from 'rxjs';
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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationPreferencesService: NotificationPreferencesService,
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
      if (!this.notificationPreferencesService.shouldSurfaceNotification(notification.type)) {
        if (!notification.isRead) {
          this.markAsReadSilently(notification.id);
        }

        return;
      }

      this.liveNotificationSubject.next(notification);

      if (!notification.isRead) {
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      }

      if (this.notificationPreferencesService.shouldShowBanner(notification.type)) {
        this.liveBannerSubject.next(notification);
      }
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

    return this.http.get<any>(this.api, { params }).pipe(
      map((response) => this.filterNotificationResponse(response)),
    );
  }

  getUnreadCount(): Observable<NotificationUnreadCountDto> {
    return this.getMy(1, 200).pipe(
      map((response) => {
        const items = this.extractItems(response);
        const unreadCount = items.filter((item) => !item.isRead).length;
        const dto = { unreadCount };
        this.unreadCountSubject.next(unreadCount);
        return dto;
      }),
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

  private filterNotificationResponse(response: any): any {
    const items = this.extractItems(response);
    const visibleItems = items.filter((item) =>
      this.notificationPreferencesService.shouldSurfaceNotification(item.type),
    );

    const hiddenUnreadItems = items.filter(
      (item) =>
        !this.notificationPreferencesService.shouldSurfaceNotification(item.type) &&
        !item.isRead,
    );

    hiddenUnreadItems.forEach((item) => this.markAsReadSilently(item.id));

    if (Array.isArray(response)) {
      return visibleItems;
    }

    if (response && Array.isArray(response.items)) {
      return {
        ...response,
        items: visibleItems,
        totalCount: visibleItems.length,
      };
    }

    return response;
  }

  private extractItems(response: any): NotificationDto[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.items)) {
      return response.items as NotificationDto[];
    }

    return [];
  }

  private markAsReadSilently(id: number): void {
    this.http.post<void>(`${this.api}/${id}/read`, {}).subscribe({
      next: () => {
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
      },
      error: () => void 0,
    });
  }
}
