import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import {
  NotificationDto,
  NotificationService
} from '../../services/notification';

import { RouterHistoryService } from '../../services/router-history';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {

  notifications: NotificationDto[] = [];
  isLoading = true;
  private liveSub?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private routerHistoryService: RouterHistoryService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.liveSub = this.notificationService.liveNotification$.subscribe(notification => {
      const actionUrl = notification.actionUrl?.trim() || '';
      const shouldLogoutAndRedirect = this.notificationService.isExternalActionUrl(actionUrl);

      this.ngZone.run(() => {
        if (shouldLogoutAndRedirect) {
          this.notificationService.stopLiveConnection();
          this.notificationService.logoutAndRedirect(actionUrl);
          return;
        }

        if (this.notifications.some(n => n.id === notification.id)) {
          return;
        }

        this.notifications = [notification, ...this.notifications];
        this.cdr.markForCheck();
      });
    });
    this.loadNotifications();
    this.notificationService.startLiveConnection();
  }

  ngOnDestroy(): void {
    this.liveSub?.unsubscribe();
  }

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  loadNotifications(): void {
    this.isLoading = true;

    this.notificationService.getMy().subscribe({
      next: (res) => {
        this.notifications = res.items ?? res ?? [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openNotification(notification: NotificationDto): void {
    const proceed = () => this.handleNotificationAction(notification);

    if (notification.isRead) {
      proceed();
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        );
        this.cdr.detectChanges();
        proceed();
      },
      error: () => {
        proceed();
      },
    });
  }

  markAsRead(notification: NotificationDto): void {
    if (notification.isRead) {
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe(() => {
      this.notifications = this.notifications.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      );
      this.cdr.detectChanges();
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.cdr.detectChanges();
    });
  }

  deleteReadNotifications(): void {
    this.notificationService.deleteAllRead().subscribe(() => {
      this.notifications = this.notifications.filter((notification) => !notification.isRead);
      this.cdr.detectChanges();
    });
  }

  deleteNotification(notification: NotificationDto, event: Event): void {
    event.stopPropagation();

    if (!notification.isRead) {
      return;
    }

    this.notificationService.delete(notification.id).subscribe(() => {
      this.notifications = this.notifications.filter((item) => item.id !== notification.id);
      this.cdr.detectChanges();
    });
  }

  hasReadNotifications(): boolean {
    return this.notifications.some((notification) => notification.isRead);
  }

  private handleNotificationAction(notification: NotificationDto): void {
    const actionUrl = notification.actionUrl?.trim();
    if (!actionUrl) {
      return;
    }

    if (this.notificationService.isExternalActionUrl(actionUrl)) {
      this.notificationService.stopLiveConnection();
      this.notificationService.logoutAndRedirect(actionUrl);
      return;
    }

    this.router.navigateByUrl(actionUrl);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
