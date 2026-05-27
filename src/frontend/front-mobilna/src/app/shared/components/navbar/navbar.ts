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
  moreMenuOpen = false;
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
    { labelKey: 'nav.planner', icon: 'calendar_month', route: '/event-planner-preview' },
    { labelKey: 'planner.notifications', icon: 'notifications', route: '/notifications' },
    { labelKey: 'nav.profile', icon: 'person_outline', route: '/profile' },
    { labelKey: 'settings.title', icon: 'settings', route: '/settings' },
  ];
  mobilePrimaryNavItems: NavItem[] = this.navItems.filter(
    (item) => item.route !== '/profile' && item.route !== '/settings',
  );
  mobileMoreNavItems: NavItem[] = this.navItems.filter(
    (item) => item.route === '/profile' || item.route === '/settings',
  );

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
        this.moreMenuOpen = false;
        this.emitMoreMenuState();
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

  isMoreMenuActive(): boolean {
    return this.mobileMoreNavItems.some((item) => this.isActive(item.route));
  }

  toggleMoreMenu(): void {
    this.moreMenuOpen = !this.moreMenuOpen;
    this.emitMoreMenuState();
  }

  closeMoreMenu(): void {
    this.moreMenuOpen = false;
    this.emitMoreMenuState();
  }

  goTo(route: string): void {
    const protectedRoutes = ['/favorites', '/profile', '/notifications'];
    if (protectedRoutes.includes(route) && !this.authService.isLoggedIn()) {
      this.moreMenuOpen = false;
      this.emitMoreMenuState();
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: route }
      });

      return;
    }
    this.moreMenuOpen = false;
    this.emitMoreMenuState();
    this.router.navigate([route]);
  }

  private emitMoreMenuState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('spirego-mobile-more-menu', {
      detail: { open: this.moreMenuOpen },
    }));
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
