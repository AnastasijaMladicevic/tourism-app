import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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
import {
  PushAvailabilityReason,
  PushNotificationService,
  PushNotificationSettingsDto,
} from '../../services/push-notification';

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
  pushNotificationsEnabled = false;
  pushNotificationsBusy = false;
  pushAvailable = false;
  pushNeedsSecureContext = false;
  pushMessageKey: string | null = null;
  pushMessageText: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private routerHistoryService: RouterHistoryService,
    private authService: AuthService,
    private notificationPreferencesService: NotificationPreferencesService,
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
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

    this.loadPushSettings();
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
    if (!enabled && this.pushNotificationsEnabled && !this.pushNotificationsBusy) {
      void this.setBackgroundNotificationsEnabled(false);
    }
    this.refreshUnreadCount();
  }

  setBannerMode(mode: NotificationBannerMode): void {
    this.notificationPreferencesService.setBannerMode(mode);
  }

  setNotificationTypeEnabled(type: AppNotificationType, enabled: boolean): void {
    this.notificationPreferencesService.setTypeEnabled(type, enabled);
    this.refreshUnreadCount();
  }

  async setBackgroundNotificationsEnabled(enabled: boolean): Promise<void> {
    this.pushNotificationsBusy = true;
    this.pushMessageKey = null;
    this.pushMessageText = null;
    this.cdr.detectChanges();

    try {
      const result = await this.pushNotificationService.setEnabled(enabled);
      if (result.ok) {
        this.pushNotificationsEnabled = result.enabled;
        this.pushMessageKey = result.enabled
          ? 'settings.pushBackgroundEnabled'
          : 'settings.pushBackgroundDisabled';
      } else {
        this.pushNotificationsEnabled = false;
        this.pushMessageKey = this.mapPushReasonToMessage(result.reason);
      }
    } catch (error) {
      this.pushNotificationsEnabled = false;
      this.pushMessageText = this.extractPushErrorMessage(error);
      this.pushMessageKey = this.pushMessageText ? null : 'settings.pushSaveError';
    } finally {
      this.pushNotificationsBusy = false;
      this.cdr.detectChanges();
    }
  }

  onBackgroundNotificationsToggleClick(): void {
    void this.setBackgroundNotificationsEnabled(!this.pushNotificationsEnabled);
  }

  private refreshUnreadCount(): void {
    this.notificationService.refreshUnreadCount().subscribe({
      error: () => void 0,
    });
  }

  private async loadPushSettings(): Promise<void> {
    this.pushAvailable = this.pushNotificationService.isSupported();
    this.pushNeedsSecureContext =
      this.pushAvailable && !this.pushNotificationService.isSecureContextSupported();

    if (!this.pushAvailable || this.pushNeedsSecureContext) {
      this.pushNotificationsBusy = false;
      return;
    }

    try {
      const settings = await this.pushNotificationService.loadSettings();
      this.applyPushSettings(settings);
    } catch {
      this.pushMessageKey = 'settings.pushLoadError';
    } finally {
      this.pushNotificationsBusy = false;
      this.cdr.detectChanges();
    }
  }

  private applyPushSettings(settings: PushNotificationSettingsDto): void {
    this.pushNotificationsEnabled = !!settings.enabled && !!settings.hasSubscription;
  }

  private mapPushReasonToMessage(reason?: PushAvailabilityReason): string {
    switch (reason) {
      case 'unsupported':
        return 'settings.pushUnsupported';
      case 'insecure':
        return 'settings.pushRequiresHttps';
      case 'missing-key':
        return 'settings.pushUnavailable';
      case 'denied':
        return 'settings.pushPermissionDenied';
      default:
        return 'settings.pushSaveError';
    }
  }

  private extractPushErrorMessage(error: unknown): string | null {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message.trim();
    }

    return null;
  }
}
