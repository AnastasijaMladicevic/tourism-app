import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth';
import { RouterHistoryService } from '../../services/router-history';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LocationTrackingService } from '../../services/location-tracking';
import {
  AppNotificationType,
  NotificationBannerMode,
  NotificationPreferenceGroupView,
  NotificationPreferencesService,
} from '../../services/notification-preferences';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
  imports: [CommonModule, MatIconModule, TranslatePipe],
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private routerHistoryService: RouterHistoryService,
    private locationTrackingService: LocationTrackingService,
    private notificationPreferencesService: NotificationPreferencesService,
    private notificationService: NotificationService,
  ) { }

  generalItems = [
    {
      icon: 'person',
      titleKey: 'settings.menu.editProfile',
      route: '/profile/edit',
      accent: 'cyan'
    },
    {
      icon: 'language',
      titleKey: 'settings.menu.language',
      route: '/language',
      accent: 'green'
    },
    {
      icon: 'public',
      titleKey: 'settings.menu.region',
      route: '/region',
      accent: 'purple'
    },
    {
      icon: 'support_agent',
      titleKey: 'settings.menu.support',
      route: '/support',
      accent: 'blue'
    },
    {
      icon: 'privacy_tip',
      titleKey: 'settings.menu.privacy',
      route: '/privacy-data',
      accent: 'indigo'
    },
    {
      icon: 'gavel',
      titleKey: 'settings.menu.terms',
      route: '/terms',
      accent: 'orange'
    },
    {
      icon: 'info',
      titleKey: 'settings.menu.about',
      route: '/about',
      accent: 'teal'
    },
    {
      icon: 'dark_mode',
      titleKey: 'settings.menu.appearance',
      action: 'theme',
      accent: 'gray'
    },
  ];

  locationEnabled = false;
  showLocationConsentHint = false;
  notificationsEnabled = true;
  bannerMode: NotificationBannerMode = 'banner';
  notificationGroups: NotificationPreferenceGroupView[] = [];

  ngOnInit(): void {
    this.subscriptions.add(
      this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
        this.locationEnabled = enabled;
      }),
    );

    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.showLocationConsentHint = params.get('locationConsent') === '1';
      }),
    );

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

  handleItem(item: any): void {
    if (item.route === '/profile/edit') {

      if (!this.authService.isLoggedIn()) {

        this.router.navigate(['/login'], {
          queryParams: {
            returnUrl: this.router.url
          }
        });

        return;
      }
    }
    if (item.route) {
      this.router.navigate([item.route]);
      return;
    }

    if (item.action == 'logout') {
      this.logout();
    }
  }

  isNotificationTypeEnabled(type: AppNotificationType): boolean {
    return this.notificationPreferencesService.isTypeEnabled(type);
  }

  setLocationEnabled(enabled: boolean): void {
    if (enabled) {
      const started = this.locationTrackingService.startTracking();
      this.locationEnabled = started;
      if (started) {
        this.clearLocationConsentHint();
      }
      return;
    }

    this.locationTrackingService.stopTracking();
    this.locationEnabled = false;
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

  logout(): void {
    this.authService.logout().subscribe({
      error: () => void 0,
    });
  }

  dismissLocationConsentHint(): void {
    this.clearLocationConsentHint();
  }

  private refreshUnreadCount(): void {
    this.notificationService.refreshUnreadCount().subscribe({
      error: () => void 0,
    });
  }

  private clearLocationConsentHint(): void {
    this.showLocationConsentHint = false;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { locationConsent: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
