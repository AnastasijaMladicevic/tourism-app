import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent, TranslatePipe],
  templateUrl: './adminlayout.component.html',
  styleUrls: ['./adminlayout.component.css']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  isMapRoute = false;
  private navSubscription?: Subscription;

  user = {
    name: '',
    email: '',
    initials: '',
    avatarUrl: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.loadUser();
    window.addEventListener('storage', this.loadUser);
    this.syncMapRoute();
    this.navSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        //this.closeSidebar();
        this.syncMapRoute();
      });
  }

  private syncMapRoute(): void {
    this.isMapRoute = this.router.url.includes('/admin/map');
    document.body.classList.toggle('admin-map-route', this.isMapRoute);
    //if (this.isMapRoute) {
    //  this.closeSidebar();
    //}
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.loadUser);
    this.navSubscription?.unsubscribe();
    document.body.classList.remove('admin-nav-open');
    document.body.classList.remove('admin-map-route');
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    document.body.classList.toggle('admin-nav-open', this.sidebarOpen);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    document.body.classList.remove('admin-nav-open');
  }

  private loadUser = (): void => {
    const userData = this.authService.getCurrentUser();

    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = {
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      initials: `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase(),
      avatarUrl: userData.profileImageUrl || ''
    };
  };
}
