import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationsService, NotificationDto } from '../../../services/notifications.service';
import { AuthService } from '../../../services/auth.service';
import { TranslationService } from '../../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly authService = inject(AuthService);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isOpen = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isMarkingAll = signal(false);
  protected readonly notifications = signal<NotificationDto[]>([]);
  protected readonly unreadCount = signal(0);

  protected readonly hasUnread = computed(() => this.unreadCount() > 0);
  protected readonly unreadBadgeLabel = computed(() => {
    const count = this.unreadCount();
    return count > 99 ? '99+' : String(count);
  });

  ngOnInit(): void {
    this.notificationsService.startPolling();

    this.notificationsService.unreadCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((count) => this.unreadCount.set(count));

    this.notificationsService.getPreview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.notifications.set(items);
        this.isLoading.set(false);
      });

    this.notificationsService.refreshPreview();
  }

  protected togglePanel(): void {
    this.isOpen.update((value) => !value);
    if (!this.isOpen()) {
      return;
    }

    this.notificationsService.refreshPreview();
    void this.notificationsService.getUnreadCount().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected markAllAsRead(event: Event): void {
    event.stopPropagation();
    if (this.isMarkingAll()) {
      return;
    }

    this.isMarkingAll.set(true);
    this.notificationsService.markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
          this.isMarkingAll.set(false);
        },
        error: () => {
          this.isMarkingAll.set(false);
        },
      });
  }

  protected openNotification(notification: NotificationDto): void {
    const performNavigation = () => {
      const actionUrl = notification.actionUrl?.trim();
      if (!actionUrl) {
        if (this.isCreatorRoleRequestNotification(notification)) {
          this.router.navigateByUrl('/admin/users?tab=tourists');
        }
        this.isOpen.set(false);
        return;
      }

      if (/^https?:\/\//i.test(actionUrl)) {
        window.location.href = actionUrl;
        return;
      }

      this.router.navigateByUrl(this.resolveInternalActionUrl(actionUrl, notification));
      this.isOpen.set(false);
    };

    if (notification.isRead) {
      performNavigation();
      return;
    }

    this.notificationsService.markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update((items) =>
            items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
          );
          performNavigation();
        },
        error: () => {
          performNavigation();
        },
      });
  }

  protected notificationKind(notification: NotificationDto): string {
    const type = (notification.type ?? '').toLowerCase();
    if (type.includes('creator')) {
      return 'role';
    }
    if (type.includes('review')) {
      return 'review';
    }
    if (type.includes('event')) {
      return 'event';
    }
    return 'general';
  }

  protected formatRelativeTime(value?: string | null): string {
    if (!value) {
      return this.translationService.translate('layout.justNow');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.translationService.translate('layout.justNow');
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
    if (diffMinutes < 1) {
      return this.translationService.translate('layout.justNow');
    }
    if (diffMinutes < 60) {
      return this.translationService.translate('layout.minutesAgo', { count: diffMinutes });
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return this.translationService.translate('layout.hoursAgo', { count: diffHours });
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) {
      return this.translationService.translate('layout.daysAgo', { count: diffDays });
    }

    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.isOpen.set(false);
  }

  private isCreatorRoleRequestNotification(notification: NotificationDto): boolean {
    const type = (notification.type ?? '').toLowerCase();
    return type === 'adminnewcreatorrolerequest';
  }

  private isManagerReportNotification(notification?: NotificationDto): boolean {
    const type = (notification?.type ?? '').toLowerCase();
    return type === 'adminnewmanagerreport' || type === 'adminrepeatedmanagerreports';
  }

  private resolveManagerReportActionUrl(
    normalized: string,
    notification?: NotificationDto,
  ): string | null {
    const reportIdFromPath = normalized.match(/^\/manager-reports\/(\d+)(?:\/|$)/)?.[1];
    if (reportIdFromPath) {
      return `/admin/users?tab=internal&reportId=${reportIdFromPath}`;
    }

    if (notification && this.isManagerReportNotification(notification)) {
      return '/admin/users?tab=internal';
    }

    return null;
  }

  private resolveInternalActionUrl(actionUrl: string, notification?: NotificationDto): string {
    const normalized = actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`;
    const role = this.authService.getAuthenticatedRole();

    if (
      normalized.startsWith('/users/creator-requests')
      || normalized.includes('/creator-requests')
      || (notification && this.isCreatorRoleRequestNotification(notification))
    ) {
      return '/admin/users?tab=tourists';
    }

    const managerReportUrl = this.resolveManagerReportActionUrl(normalized, notification);
    if (managerReportUrl) {
      return managerReportUrl;
    }

    if (role === 'admin') {
      if (normalized.startsWith('/users')) {
        return `/admin${normalized}`;
      }
      if (normalized.startsWith('/destinations')) {
        return `/admin${normalized}`;
      }
      if (normalized.startsWith('/map')) {
        return `/admin${normalized}`;
      }
    }

    if (role === 'content-creator') {
      if (normalized.startsWith('/reviews')) {
        return `/content-creator${normalized}`;
      }
      if (normalized.startsWith('/objects') || normalized.startsWith('/activities') || normalized.startsWith('/events') || normalized.startsWith('/map')) {
        return `/content-creator${normalized}`;
      }
    }

    if (role === 'manager') {
      if (normalized.startsWith('/objects') || normalized.startsWith('/activities') || normalized.startsWith('/events') || normalized.startsWith('/localities') || normalized.startsWith('/map')) {
        return `/manager${normalized}`;
      }
    }

    return normalized;
  }
}
