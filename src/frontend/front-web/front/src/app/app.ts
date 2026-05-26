import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './services/auth.service';
import { UserDto } from './models/user.model';
import { TranslatePipe } from './shared/pipes/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('front');
  protected readonly roleRedirectNotice = signal('');
  protected readonly bannedAccountNotice = signal('');

  private readonly roleCheckIntervalMs = 10000;
  private roleCheckTimer?: ReturnType<typeof setInterval>;
  private redirectTimer?: ReturnType<typeof setTimeout>;
  private isRedirectingForRoleChange = false;
  private readonly syncBanNoticeHandler = () => this.syncBanNotice();

  private currentUrl = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUrl = this.router.url;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects;
        this.syncBanNotice();
      });

    this.syncBanNotice();
    this.checkForContentCreatorDowngrade();
    this.roleCheckTimer = setInterval(
      () => this.checkForContentCreatorDowngrade(),
      this.roleCheckIntervalMs,
    );
    window.addEventListener('auth-user-changed', this.syncBanNoticeHandler);
    window.addEventListener('banned-user-action-blocked', this.syncBanNoticeHandler);
  }

  ngOnDestroy(): void {
    if (this.roleCheckTimer) {
      clearInterval(this.roleCheckTimer);
    }
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
    window.removeEventListener('auth-user-changed', this.syncBanNoticeHandler);
    window.removeEventListener('banned-user-action-blocked', this.syncBanNoticeHandler);
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

  private syncBanNotice(): void {
    if (this.currentUrl.startsWith('/account-banned') || this.authService.isBannedContentCreator()) {
      this.bannedAccountNotice.set('');
      return;
    }

    const persistedMessage = sessionStorage.getItem('spirego-admin-ban-message')?.trim();
    if (persistedMessage) {
      this.bannedAccountNotice.set(persistedMessage);
      return;
    }

    const currentUser = this.authService.getUser();
    if (!currentUser?.isBanned) {
      this.bannedAccountNotice.set('');
      return;
    }

    const reason = currentUser.banReason?.trim() || 'Krsenje pravila platforme.';
    const expiresAt = currentUser.banExpiresAtUtc?.trim();
    this.bannedAccountNotice.set(
      expiresAt
        ? `Ovaj nalog je banovan do ${this.formatUtc(expiresAt)}. Razlog: ${reason}`
        : `Ovaj nalog je trajno banovan. Razlog: ${reason}`,
    );
  }

  private formatUtc(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}. ${hours}:${minutes} UTC`;
  }
}
