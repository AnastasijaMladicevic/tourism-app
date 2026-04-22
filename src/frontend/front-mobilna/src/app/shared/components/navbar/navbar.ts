import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LogoComponent } from '../logo/logo';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, LogoComponent, TranslatePipe],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent {
  activeRoute = '';

  // Rute na kojima se navbar NE prikazuje
  private hiddenRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/code-verification',
    '/new-credentials',
    '/password-updated',
  ];

  navItems: NavItem[] = [
    { labelKey: 'nav.home', icon: 'home', route: '/home' },
    { labelKey: 'nav.map', icon: 'map', route: '/map' },
    { labelKey: 'nav.favorites', icon: 'favorite', route: '/favorites' },
    { labelKey: 'nav.planner', icon: 'calendar_month', route: '/planner' },
    { labelKey: 'nav.profile', icon: 'person_outline', route: '/profile' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.activeRoute = e.urlAfterRedirects;
      });
  }

  get isVisible(): boolean {
    return !this.hiddenRoutes.some((r) => this.activeRoute.startsWith(r));
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  goTo(route: string): void {
    const protectedRoutes = ['/favorites', '/profile'];
    if (protectedRoutes.includes(route) && !this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate([route]);
  }
}
