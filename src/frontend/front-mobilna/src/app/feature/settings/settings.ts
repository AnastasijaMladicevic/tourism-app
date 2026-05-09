import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';
import { RouterHistoryService } from '../../services/router-history';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
  imports: [CommonModule, MatIconModule],
})
export class SettingsComponent {

  constructor(
    private router: Router,
    private authService: AuthService,
    private routerHistoryService: RouterHistoryService
  ) { }

  generalItems = [
    {
      icon: 'person',
      title: 'Edit profile',
      route: '/profile/edit',
      accent: 'cyan'
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      route: '/notifications',
      accent: 'blue'
    },
    {
      icon: 'language',
      title: 'Language',
      route: '/language',
      accent: 'green'
    },
    {
      icon: 'public',
      title: 'Region',
      route: '/region',
      accent: 'purple'
    },
    {
      icon: 'support_agent',
      title: 'Help & Support',
      route: '/support',
      accent: 'blue'
    },
    {
      icon: 'privacy_tip',
      title: 'Privacy & Data',
      route: '/privacy-data',
      accent: 'indigo'
    },
    {
      icon: 'gavel',
      title: 'Terms of Use',
      route: '/terms',
      accent: 'orange'
    },
    {
      icon: 'info',
      title: 'About',
      route: '/about',
      accent: 'teal'
    },
    {
      icon: 'dark_mode',
      title: 'Appearance',
      action: 'theme',
      accent: 'gray'
    },
  ];

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  handleItem(item: any): void {
    if (item.route === '/edit-profile') {

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

  logout(): void {
    this.authService.logout();
  }
}