import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BanCountdownParts, computeBanCountdown } from '../../utils/ban-countdown';

@Component({
  selector: 'app-account-banned',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-banned.component.html',
  styleUrl: './account-banned.component.css',
})
export class AccountBannedComponent implements OnInit, OnDestroy {
  protected readonly banReason = signal('Krsenje pravila platforme.');
  protected readonly isPermanent = signal(false);
  protected readonly banExpiresLabel = signal('');
  protected readonly countdown = signal<BanCountdownParts | null>(null);
  protected readonly banEnded = signal(false);
  protected readonly isCheckingStatus = signal(false);
  protected readonly countdownTick = signal(false);

  private banExpiresAtUtc: string | null = null;
  private lastMinuteBucket = -1;
  private tickSub?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadBanState();
    this.tickSub = interval(1000).subscribe(() => this.updateCountdown());
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
  }

  signOut(): void {
    this.router.navigate(['/signout']);
  }

  protected formatUnit(value: number): string {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  checkAccessAgain(): void {
    if (this.isCheckingStatus()) {
      return;
    }

    this.isCheckingStatus.set(true);
    const currentUser = this.authService.getUser();
    if (!currentUser?.id) {
      this.isCheckingStatus.set(false);
      this.router.navigate(['/login']);
      return;
    }

    this.authService
      .getById(currentUser.id)
      .pipe(take(1))
      .subscribe({
        next: (user) => {
          this.isCheckingStatus.set(false);
          if (!user.isBanned) {
            this.router.navigateByUrl(this.authService.getDashboardRouteForRole('content-creator'));
            return;
          }

          this.banExpiresAtUtc = user.banExpiresAtUtc ?? null;
          this.banReason.set(user.banReason?.trim() || 'Krsenje pravila platforme.');
          this.isPermanent.set(!this.banExpiresAtUtc);
          this.banExpiresLabel.set(this.formatExpiryLabel(this.banExpiresAtUtc));
          this.updateCountdown();
        },
        error: () => {
          this.isCheckingStatus.set(false);
        },
      });
  }

  private loadBanState(): void {
    const snapshot = this.authService.getBanSnapshot();
    this.banReason.set(snapshot.reason);
    this.isPermanent.set(snapshot.isPermanent);
    this.banExpiresAtUtc = snapshot.expiresAtUtc;
    this.banExpiresLabel.set(this.formatExpiryLabel(snapshot.expiresAtUtc));
    this.updateCountdown();
  }

  private updateCountdown(): void {
    if (this.isPermanent()) {
      this.countdown.set(null);
      this.banEnded.set(false);
      return;
    }

    const parts = computeBanCountdown(this.banExpiresAtUtc);
    this.countdown.set(parts);

    if (parts && !parts.expired) {
      const minuteBucket =
        parts.months * 31 * 24 * 60 +
        parts.days * 24 * 60 +
        parts.hours * 60 +
        parts.minutes;
      if (minuteBucket !== this.lastMinuteBucket) {
        this.lastMinuteBucket = minuteBucket;
        this.countdownTick.update((value) => !value);
      }
    }

    if (parts?.expired) {
      this.banEnded.set(true);
      this.tryRefreshSessionAfterExpiry();
    }
  }

  private tryRefreshSessionAfterExpiry(): void {
    if (this.isCheckingStatus()) {
      return;
    }

    this.isCheckingStatus.set(true);
    this.authService
      .refresh()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.isCheckingStatus.set(false);
          if (!response.isBanned) {
            this.router.navigateByUrl(this.authService.getDashboardRouteForRole('content-creator'));
          }
        },
        error: () => {
          this.isCheckingStatus.set(false);
        },
      });
  }

  private formatExpiryLabel(expiresAtUtc: string | null): string {
    if (!expiresAtUtc?.trim()) {
      return '';
    }

    const date = new Date(expiresAtUtc);
    if (Number.isNaN(date.getTime())) {
      return expiresAtUtc;
    }

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}. ${hours}:${minutes} UTC`;
  }
}
