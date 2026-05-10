import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RouterHistoryService } from '../../services/router-history';
import { AuthService } from '../../services/auth';
import {
  AppNotificationType,
  NotificationBannerMode,
  NotificationPreferenceGroupView,
  NotificationPreferencesService,
} from '../../services/notification-preferences';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-notification-settings',
  templateUrl: './notification-settings.html',
  styleUrls: ['./notification-settings.scss'],
  imports: [CommonModule, MatIconModule, TranslatePipe],
})
export class NotificationSettingsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  notificationsEnabled = true;
  bannerMode: NotificationBannerMode = 'banner';
  notificationGroups: NotificationPreferenceGroupView[] = [];

  constructor(
    private router: Router,
    private routerHistoryService: RouterHistoryService,
    private authService: AuthService,
    private notificationPreferencesService: NotificationPreferencesService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.notificationPreferencesService.state$.subscribe((state) => {
        this.notificationsEnabled = state.notificationsEnabled;
        this.bannerMode = state.bannerMode;
        this.notificationGroups = this.notificationPreferencesService.getGroupedDefinitionsForRole(
          this.authService.getAuthenticatedRole(),
        );
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  isNotificationTypeEnabled(type: AppNotificationType): boolean {
    return this.notificationPreferencesService.isTypeEnabled(type);
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.notificationPreferencesService.setNotificationsEnabled(enabled);
    this.refreshUnreadCount();
  }

  setBannerMode(mode: NotificationBannerMode): void {
    this.notificationPreferencesService.setBannerMode(mode);
  }

  setNotificationTypeEnabled(type: AppNotificationType, enabled: boolean): void {
    this.notificationPreferencesService.setTypeEnabled(type, enabled);
    this.refreshUnreadCount();
  }

  private refreshUnreadCount(): void {
    this.notificationService.refreshUnreadCount().subscribe({
      error: () => void 0,
    });
  }
}
