import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { UserDto } from './models/user.model';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('front');
  protected readonly roleRedirectNotice = signal('');

  private readonly roleCheckIntervalMs = 10000;
  private roleCheckTimer?: ReturnType<typeof setInterval>;
  private redirectTimer?: ReturnType<typeof setTimeout>;
  private isRedirectingForRoleChange = false;

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.checkForContentCreatorDowngrade();
    this.roleCheckTimer = setInterval(
      () => this.checkForContentCreatorDowngrade(),
      this.roleCheckIntervalMs,
    );
  }

  ngOnDestroy(): void {
    if (this.roleCheckTimer) {
      clearInterval(this.roleCheckTimer);
    }
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  private checkForContentCreatorDowngrade(): void {
    if (this.isRedirectingForRoleChange || !this.authService.isLoggedIn()) {
      return;
    }

    if (this.authService.getAuthenticatedRole() !== 'content-creator') {
      return;
    }

    const currentUser = this.authService.getUser();
    if (!currentUser?.id) {
      return;
    }

    this.authService.getById(currentUser.id).subscribe({
      next: (user) => {
        if (this.normalizeRole(user.roleName) !== 'tourist') {
          return;
        }

        this.beginRoleRedirect(
          'Tvoja Content Creator uloga je uklonjena. Preusmeravamo te na turisticku aplikaciju.',
          this.resolvePublicAppHomeUrl(user),
        );
      },
      error: () => {
        // Ignore transient errors and retry on the next polling cycle.
      },
    });
  }

  private beginRoleRedirect(message: string, targetUrl: string): void {
    if (this.isRedirectingForRoleChange) {
      return;
    }

    this.isRedirectingForRoleChange = true;
    this.roleRedirectNotice.set(message);
    this.redirectTimer = setTimeout(() => {
      this.authService.logout();
      window.location.href = targetUrl;
    }, 1800);
  }

  private resolvePublicAppHomeUrl(user: UserDto): string {
    const configuredUrl = user.publicAppHomeUrl?.trim();
    if (configuredUrl) {
      return configuredUrl;
    }

    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4200/home`;
  }

  private normalizeRole(role?: string | null): string {
    if (!role) {
      return '';
    }

    return role.toLowerCase().replace(/[_\s-]+/g, '');
  }
}
