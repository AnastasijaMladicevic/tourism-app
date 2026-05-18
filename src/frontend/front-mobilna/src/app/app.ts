import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FloatingAiAssistantComponent } from './shared/components/floating-ai-assistant/floating-ai-assistant.component';
import { LiveNotificationBannerComponent } from './shared/components/live-notification-banner/live-notification-banner.component';
import { LiveLocationShareService } from './services/live-location-share';
import { LocationIntelligenceService } from './services/location-intelligence';
import { AuthService } from './services/auth';
import { ThemeService } from './services/theme';
@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, NavbarComponent, FloatingAiAssistantComponent, LiveNotificationBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly liveLocationShareService = inject(LiveLocationShareService);
  private readonly locationIntelligenceService = inject(LocationIntelligenceService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  protected readonly title = signal('front-mobilna');
  protected readonly bannedAccountNotice = signal('');

  private readonly syncBanNoticeHandler = () => this.syncBanNotice();

  constructor() {
    void this.liveLocationShareService;
    void this.locationIntelligenceService;
    void this.themeService;
  }

  ngOnInit(): void {
    this.syncBanNotice();
    window.addEventListener('auth-user-changed', this.syncBanNoticeHandler);
    window.addEventListener('banned-user-action-blocked', this.syncBanNoticeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('auth-user-changed', this.syncBanNoticeHandler);
    window.removeEventListener('banned-user-action-blocked', this.syncBanNoticeHandler);
  }

  private syncBanNotice(): void {
    const persistedMessage = sessionStorage.getItem('spirego-ban-message')?.trim();
    if (persistedMessage) {
      this.bannedAccountNotice.set(persistedMessage);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
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
