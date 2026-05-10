import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { NotificationDto, NotificationService } from '../../../services/notification';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-live-notification-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './live-notification-banner.component.html',
  styleUrl: './live-notification-banner.component.scss',
})
export class LiveNotificationBannerComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  private readonly queue: NotificationDto[] = [];
  private liveSub?: Subscription;
  private dismissTimer?: ReturnType<typeof setTimeout>;

  protected readonly currentNotification = signal<NotificationDto | null>(null);

  ngOnInit(): void {
    this.liveSub = this.notificationService.liveBanner$.subscribe((notification) => {
      this.queue.push(notification);

      if (!this.currentNotification()) {
        this.showNext();
      }
    });
  }

  ngOnDestroy(): void {
    this.liveSub?.unsubscribe();
    this.clearTimer();
  }

  protected dismiss(event?: Event): void {
    event?.stopPropagation();
    this.currentNotification.set(null);
    this.clearTimer();

    if (this.queue.length) {
      this.showNext();
    }
  }

  protected openNotifications(): void {
    this.queue.length = 0;
    this.dismiss();
    this.router.navigate(['/notifications']);
  }

  private showNext(): void {
    const nextNotification = this.queue.shift() ?? null;
    this.currentNotification.set(nextNotification);
    this.clearTimer();

    if (!nextNotification) {
      return;
    }

    this.dismissTimer = setTimeout(() => {
      this.dismiss();
    }, 4000);
  }

  private clearTimer(): void {
    if (!this.dismissTimer) {
      return;
    }

    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
  }
}
