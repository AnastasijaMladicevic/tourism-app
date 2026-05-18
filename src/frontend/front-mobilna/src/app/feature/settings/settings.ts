import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth';
import { RouterHistoryService } from '../../services/router-history';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

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
    private authService: AuthService,
    private routerHistoryService: RouterHistoryService,
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
      icon: 'notifications',
      titleKey: 'settings.menu.notifications',
      route: '/notification-settings',
      accent: 'blue'
    },
    {
      icon: 'location_on',
      titleKey: 'settings.menu.location',
      route: '/location-settings',
      accent: 'teal'
    },
    {
      icon: 'verified_user',
      titleKey: 'settings.menu.twoFactor',
      route: '/two-factor-settings',
      accent: 'indigo'
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
      route: '/appearance',
      accent: 'gray'
    },
  ];
  get visibleGeneralItems() {
    return this.generalItems.filter(item => {
      if (item.route === '/profile/edit' || item.route === '/two-factor-settings') {
        return this.authService.isLoggedIn();
      }

      return true;
    });
  }
  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  handleItem(item: any): void {
    if (item.route) {
      this.router.navigate([item.route]);
      return;
    }
  }

}
