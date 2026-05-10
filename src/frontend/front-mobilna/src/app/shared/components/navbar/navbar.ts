import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LogoComponent } from '../logo/logo';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { NotificationService } from '../../../services/notification';
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
export class NavbarComponent implements OnInit, OnDestroy {
  activeRoute = '';
  notificationsUnreadCount = 0;
  private unreadSub?: Subscription;
  private routerSub?: Subscription;

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
    { labelKey: 'planner.notifications', icon: 'notifications', route: '/notifications' },
    { labelKey: 'nav.profile', icon: 'person_outline', route: '/profile' },
    { labelKey: 'settings.title', icon: 'settings', route: '/settings' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.activeRoute = e.urlAfterRedirects;
        this.syncNotificationState();
      });
  }

  ngOnInit(): void {
    this.activeRoute = this.router.url;
    this.syncNotificationState();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  get isVisible(): boolean {
    return !this.hiddenRoutes.some((r) => this.activeRoute.startsWith(r));
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  goTo(route: string): void {
    const protectedRoutes = ['/favorites', '/profile', '/notifications'];
    if (protectedRoutes.includes(route) && !this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: route }
      });

      return;
    }
    this.router.navigate([route]);
  }

  private syncNotificationState(): void {
    if (!this.authService.isLoggedIn()) {
      this.unreadSub?.unsubscribe();
      this.unreadSub = undefined;
      this.notificationsUnreadCount = 0;
      this.notificationService.stopLiveConnection();
      this.notificationService.resetUnreadCount();
      this.cdr.detectChanges();
      return;
    }

    if (!this.unreadSub) {
      this.notificationService.startLiveConnection();
      this.unreadSub = this.notificationService.unreadCount$
        .subscribe(count => {
          this.notificationsUnreadCount = count;
          this.cdr.detectChanges();
        });
      this.notificationService.refreshUnreadCount().subscribe({
        error: () => void 0,
      });
    }
  }
}
