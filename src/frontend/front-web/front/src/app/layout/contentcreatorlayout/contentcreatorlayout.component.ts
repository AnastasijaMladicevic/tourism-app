import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '../../models/user.model';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-content-creator-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationBellComponent, TranslatePipe],
  templateUrl: './contentcreatorlayout.component.html',
  styleUrls: ['./contentcreatorlayout.component.css'],
})
export class ContentCreatorLayoutComponent implements OnInit, OnDestroy {
  searchQuery = '';
  sidebarOpen = false;
  isMapRoute = false;
  private navSubscription?: Subscription;

  user: any = {
    name: '',
    email: '',
    initials: '',
    avatarUrl: null,
  };

  constructor(private router: Router, private authService: AuthService) { }

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
    this.isMapRoute = this.router.url.includes('/content-creator/map');
    document.body.classList.toggle('cc-map-route', this.isMapRoute);
    //if (this.isMapRoute) {
    //  this.closeSidebar();
    //}
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.loadUser);
    this.navSubscription?.unsubscribe();
    document.body.classList.remove('cc-nav-open');
    document.body.classList.remove('cc-map-route');
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    document.body.classList.toggle('cc-nav-open', this.sidebarOpen);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    document.body.classList.remove('cc-nav-open');
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

  private getInitials(firstName: string, lastName: string): string {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  signOut(): void {
    this.router.navigate(['/signout']);
  }
}
