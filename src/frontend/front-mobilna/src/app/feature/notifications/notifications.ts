import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChangeDetectorRef } from '@angular/core';

import {
  NotificationDto,
  NotificationService
} from '../../services/notification';

import { RouterHistoryService } from '../../services/router-history';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatIconModule],
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
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.startLiveConnection();
    this.liveSub = this.notificationService.liveNotification$.subscribe(notification => {
      if (this.notifications.some(item => item.id === notification.id)) {
        return;
      }

      this.notifications = [notification, ...this.notifications];
      this.cdr.detectChanges();
    });
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

  markAsRead(notification: NotificationDto): void {

    if (notification.isRead) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .subscribe(() => {
        notification.isRead = true;
      });
  }

  markAllAsRead(): void {

    this.notificationService
      .markAllAsRead()
      .subscribe(() => {

        this.notifications =
          this.notifications.map(n => ({
            ...n,
            isRead: true
          }));
      });
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
