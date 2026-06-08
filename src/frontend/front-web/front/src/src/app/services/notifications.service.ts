import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, of } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environment/environment';

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

export interface PagedNotificationsResultDto {
  items: NotificationDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface NotificationUnreadCountDto {
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly refreshListSubject = new Subject<void>();
  private pollingStarted = false;

  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  startPolling(): void {
    if (this.pollingStarted) {
      return;
    }

    this.pollingStarted = true;

    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.getUnreadCount().pipe(catchError(() => of({ unreadCount: this.unreadCountSubject.value })))),
      )
      .subscribe((result) => {
        this.unreadCountSubject.next(result.unreadCount ?? 0);
      });
  }

  getPreview(pageSize = 8): Observable<NotificationDto[]> {
    return this.refreshListSubject.pipe(
      startWith(void 0),
      switchMap(() => this.getMy(1, pageSize).pipe(catchError(() => of({
        items: [] as NotificationDto[],
        page: 1,
        pageSize,
        totalCount: 0,
        totalPages: 0,
      })))),
      map((result) => result.items ?? []),
    );
  }

  refreshPreview(): void {
    this.refreshListSubject.next();
  }

  getMy(page = 1, pageSize = 20): Observable<PagedNotificationsResultDto> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http.get<PagedNotificationsResultDto>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<NotificationUnreadCountDto> {
    return this.http.get<NotificationUnreadCountDto>(`${this.apiUrl}/unread-count`).pipe(
      tap((result) => this.unreadCountSubject.next(result.unreadCount ?? 0)),
    );
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
        this.refreshPreview();
      }),
    );
  }

  markAllAsRead(): Observable<{ updatedCount: number }> {
    return this.http.post<{ updatedCount: number }>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
        this.refreshPreview();
      }),
    );
  }
}
