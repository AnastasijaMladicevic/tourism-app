import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LogoComponent } from '../logo/logo';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, LogoComponent],
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
    { label: 'Home',    icon: 'home',            route: '/home'    },
    { label: 'Map',     icon: 'map',             route: '/map'     },
    { label: 'Saved',   icon: 'bookmark_border', route: '/saved'   },
    { label: 'Planner', icon: 'calendar_month',  route: '/planner' },
    { label: 'Profile', icon: 'person_outline',  route: '/profile' },
  ];

  constructor(private router: Router, private authService: AuthService) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.activeRoute = e.urlAfterRedirects;
      });
  }

  get isVisible(): boolean {
    return !this.hiddenRoutes.some(r => this.activeRoute.startsWith(r));
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  goTo(route: string): void {
    const protectedRoutes = ['/saved', '/planner', '/profile'];
    if (protectedRoutes.includes(route) && !this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate([route]);
  }
}
