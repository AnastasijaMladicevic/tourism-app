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
    if (this.isInformationalCreatorRoleNotification(notification)) {
      if (!notification.isRead) {
        this.notificationsService.markAsRead(notification.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notifications.update((items) =>
                items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
              );
            },
          });
      }
      return;
    }

    const actionUrl = notification.actionUrl?.trim();
    if (!actionUrl) {
      if (this.isCreatorRoleRequestNotification(notification)) {
        this.router.navigateByUrl('/admin/users?tab=tourists');
      }
      return;
    }

    if (/^https?:\/\//i.test(actionUrl)) {
      window.location.href = actionUrl;
      return;
    }

    this.router.navigateByUrl(this.resolveInternalActionUrl(actionUrl, notification));
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

  /** CC role granted/revoked notices are informational only — no redirect on click. */
  private isInformationalCreatorRoleNotification(notification: NotificationDto): boolean {
    const type = (notification.type ?? '').toLowerCase();
    return (
      type === 'creatorrolerequestapproved'
      || type === 'creatorroleaccessrevoked'
    );
  }

  private isManagerReportNotification(notification?: NotificationDto): boolean {
    const type = (notification?.type ?? '').toLowerCase();
    return type === 'adminnewmanagerreport' || type === 'adminrepeatedmanagerreports';
  }

  private isAdminRejectedContentNotification(notification?: NotificationDto): boolean {
    return (notification?.type ?? '').toLowerCase() === 'admincreatormultiplerejectedcontent';
  }

  private isCreatorObjectReviewNotification(notification?: NotificationDto): boolean {
    const type = (notification?.type ?? '').toLowerCase();
    return type === 'creatornewobjectreview' || type === 'creatorobjectreviewdeleted';
  }

  private extractEntityId(normalized: string, resource: string): string | null {
    const escaped = resource.replace('/', '\\/');
    const match = normalized.match(new RegExp(`^\\/${escaped}\\/(\\d+)(?:\\/|$|\\?)`, 'i'));
    return match?.[1] ?? null;
  }

  private resolveContentCreatorActionUrl(
    normalized: string,
    notification?: NotificationDto,
  ): string | null {
    if (normalized.startsWith('/reviews')) {
      return `/content-creator${normalized}`;
    }

    const objectId = this.extractEntityId(normalized, 'object') ?? this.extractEntityId(normalized, 'objects');
    if (objectId) {
      if (this.isCreatorObjectReviewNotification(notification)) {
        return `/content-creator/reviews?objectId=${objectId}`;
      }

      return `/content-creator/objects/edit/${objectId}`;
    }

    const activityId = this.extractEntityId(normalized, 'activity') ?? this.extractEntityId(normalized, 'activities');
    if (activityId) {
      return `/content-creator/activities/edit/${activityId}`;
    }

    const eventId = this.extractEntityId(normalized, 'event') ?? this.extractEntityId(normalized, 'events');
    if (eventId) {
      return `/content-creator/events/edit/${eventId}`;
    }

    if (this.extractEntityId(normalized, 'deletion-requests')) {
      return '/content-creator/dashboard';
    }

    if (
      normalized.startsWith('/objects')
      || normalized.startsWith('/activities')
      || normalized.startsWith('/events')
      || normalized.startsWith('/map')
    ) {
      return `/content-creator${normalized}`;
    }

    return null;
  }

  private resolveManagerActionUrl(normalized: string): string | null {
    const objectId = this.extractEntityId(normalized, 'object') ?? this.extractEntityId(normalized, 'objects');
    if (objectId) {
      return `/manager/objects/review/${objectId}`;
    }

    const activityId = this.extractEntityId(normalized, 'activity') ?? this.extractEntityId(normalized, 'activities');
    if (activityId) {
      return `/manager/activities/review/${activityId}`;
    }

    const eventId = this.extractEntityId(normalized, 'event') ?? this.extractEntityId(normalized, 'events');
    if (eventId) {
      return `/manager/events/edit/${eventId}`;
    }

    const localityId = this.extractEntityId(normalized, 'localities');
    if (localityId) {
      return `/manager/localities/edit/${localityId}`;
    }

    if (this.extractEntityId(normalized, 'manager-reports')) {
      return '/manager/reports';
    }

    if (this.extractEntityId(normalized, 'deletion-requests')) {
      return '/manager/dashboard';
    }

    if (
      normalized.startsWith('/objects')
      || normalized.startsWith('/activities')
      || normalized.startsWith('/events')
      || normalized.startsWith('/localities')
      || normalized.startsWith('/map')
      || normalized.startsWith('/reports')
      || normalized.startsWith('/creator-reviews')
    ) {
      return `/manager${normalized}`;
    }

    return null;
  }

  private resolveAdminActionUrl(
    normalized: string,
    notification?: NotificationDto,
  ): string | null {
    if (
      this.isAdminRejectedContentNotification(notification)
      || this.extractEntityId(normalized, 'object')
      || this.extractEntityId(normalized, 'objects')
      || this.extractEntityId(normalized, 'activity')
      || this.extractEntityId(normalized, 'activities')
      || this.extractEntityId(normalized, 'event')
      || this.extractEntityId(normalized, 'events')
      || this.extractEntityId(normalized, 'deletion-requests')
    ) {
      return '/admin/users?tab=internal';
    }

    if (normalized.startsWith('/users')) {
      return `/admin${normalized}`;
    }
    if (normalized.startsWith('/destinations')) {
      return `/admin${normalized}`;
    }
    if (normalized.startsWith('/map')) {
      return `/admin${normalized}`;
    }

    return null;
  }

  private resolveManagerReportActionUrl(
    normalized: string,
    role: string | null,
    notification?: NotificationDto,
  ): string | null {
    const reportIdFromPath = normalized.match(/^\/manager-reports\/(\d+)(?:\/|$)/)?.[1];
    if (reportIdFromPath) {
      if (role === 'manager') {
        return '/manager/reports';
      }

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
      normalized.startsWith('/admin/')
      || normalized.startsWith('/manager/')
      || normalized.startsWith('/content-creator/')
    ) {
      return normalized;
    }

    if (
      normalized.startsWith('/users/creator-requests')
      || normalized.includes('/creator-requests')
      || (notification && this.isCreatorRoleRequestNotification(notification))
    ) {
      return '/admin/users?tab=tourists';
    }

    const managerReportUrl = this.resolveManagerReportActionUrl(normalized, role, notification);
    if (managerReportUrl) {
      return managerReportUrl;
    }

    if (role === 'admin') {
      const adminUrl = this.resolveAdminActionUrl(normalized, notification);
      if (adminUrl) {
        return adminUrl;
      }
    }

    if (role === 'content-creator') {
      const creatorUrl = this.resolveContentCreatorActionUrl(normalized, notification);
      if (creatorUrl) {
        return creatorUrl;
      }
    }

    if (role === 'manager') {
      const managerUrl = this.resolveManagerActionUrl(normalized);
      if (managerUrl) {
        return managerUrl;
      }
    }

    return normalized;
  }
}
