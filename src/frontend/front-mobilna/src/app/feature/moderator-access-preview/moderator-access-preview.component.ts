import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, UserDto } from '../../services/auth';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-moderator-access-preview',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './moderator-access-preview.component.html',
  styleUrl: './moderator-access-preview.component.scss',
})
export class ModeratorAccessPreviewComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackTone = signal<'success' | 'error'>('success');
  protected readonly requestStatus = signal<'none' | 'pending' | 'approved' | 'rejected'>('none');
  protected readonly creatorType = 'Moderator';
  private readonly requestStatusPollMs = 4000;
  private requestStatusTimer?: ReturnType<typeof setInterval>;
  private redirectingToAdmin = false;

  protected user: UserDto | null = null;

  protected readonly privileges = [
    {
      icon: 'plus',
      titleKey: 'moderatorAccess.privileges.addEvents.title',
      bodyKey: 'moderatorAccess.privileges.addEvents.body',
    },
    {
      icon: 'pin',
      titleKey: 'moderatorAccess.privileges.editObjects.title',
      bodyKey: 'moderatorAccess.privileges.editObjects.body',
    },
    {
      icon: 'activity',
      titleKey: 'moderatorAccess.privileges.manageActivities.title',
      bodyKey: 'moderatorAccess.privileges.manageActivities.body',
    },
    {
      icon: 'edit',
      titleKey: 'moderatorAccess.privileges.editEvents.title',
      bodyKey: 'moderatorAccess.privileges.editEvents.body',
    },
    {
      icon: 'chart',
      titleKey: 'moderatorAccess.privileges.analytics.title',
      bodyKey: 'moderatorAccess.privileges.analytics.body',
    },
  ];

  protected readonly roleLabel = computed(() => {
    const roleName = this.user?.roleName?.trim();

    if (!roleName || roleName === 'Tourist') {
      return this.translationService.translate('moderatorAccess.roles.tourist');
    }

    if (roleName === 'ContentCreator') {
      return this.translationService.translate('moderatorAccess.roles.moderator');
    }

    if (roleName === 'Admin') {
      return this.translationService.translate('moderatorAccess.roles.admin');
    }

    if (roleName === 'Manager') {
      return this.translationService.translate('moderatorAccess.roles.manager');
    }

    return roleName;
  });

  protected readonly canRequest = computed(() => {
    return !!this.user?.id
      && this.user?.roleName === 'Tourist'
      && !this.isSubmitting()
      && this.requestStatus() !== 'pending';
  });

  protected readonly statusLabel = computed(() => {
    const status = this.requestStatus();

    if (status === 'pending') {
      return this.translationService.translate('moderatorAccess.status.requestSent');
    }

    if (status === 'approved') {
      return this.translationService.translate('moderatorAccess.status.approved');
    }

    if (status === 'rejected') {
      return this.translationService.translate('moderatorAccess.status.rejected');
    }

    return this.translationService.translate('moderatorAccess.status.notRequested');
  });

  protected readonly requestButtonLabel = computed(() => {
    if (this.isSubmitting()) {
      return this.translationService.translate('moderatorAccess.sending');
    }

    if (this.requestStatus() === 'pending') {
      return this.translationService.translate('moderatorAccess.requestSent');
    }

    return this.translationService.translate('moderatorAccess.requestAccess');
  });

  constructor() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = currentUser;
    this.syncUserState(currentUser);
    this.refreshCurrentUser();
    this.requestStatusTimer = setInterval(() => this.refreshCurrentUser(), this.requestStatusPollMs);
  }

  ngOnDestroy(): void {
    if (this.requestStatusTimer) {
      clearInterval(this.requestStatusTimer);
    }
  }

  protected submitRequest(): void {
    if (!this.user?.id || !this.canRequest()) return;

    this.isSubmitting.set(true);
    this.feedback.set('');

    this.authService
      .requestCreatorRole(this.user.id, this.creatorType)
      .pipe(
        catchError((error) => {
          const message = (error as { error?: { message?: string } })?.error?.message;
          this.feedbackTone.set('error');
          this.feedback.set(message || this.translationService.translate('moderatorAccess.feedback.sendFailed'));
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe((result) => {
        if (!result || !this.user?.id) return;

        const updatedUser: UserDto = {
          ...this.user,
          hasRequestedCreatorRole: true,
          creatorRoleRequestStatus: 'Pending',
        };
        this.authService.setCurrentUser(updatedUser);
        this.syncUserState(updatedUser);
        this.requestStatus.set('pending');
        this.feedbackTone.set('success');
        this.feedback.set(this.translationService.translate('moderatorAccess.feedback.sendSuccess'));
      });
  }

  private refreshCurrentUser(): void {
    if (!this.user?.id) {
      return;
    }

    this.authService
      .getById(this.user.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) {
          return;
        }

        this.syncUserState(user);
      });
  }

  private syncUserState(user: UserDto): void {
    this.user = user;

    const isApproved = user.creatorRoleRequestStatus === 'Approved' || user.roleName === 'ContentCreator';

    switch (user.creatorRoleRequestStatus) {
      case 'Pending':
        this.requestStatus.set('pending');
        break;
      case 'Approved':
        this.requestStatus.set('approved');
        break;
      case 'Rejected':
        this.requestStatus.set('rejected');
        break;
      default:
        this.requestStatus.set(isApproved ? 'approved' : 'none');
        break;
    }

    if (isApproved) {
      this.redirectToAdminApp(user);
    }
  }

  private redirectToAdminApp(user: UserDto): void {
    if (this.redirectingToAdmin) {
      return;
    }

    const targetUrl = user.adminAppLoginUrl?.trim() || this.resolveAdminLoginFallbackUrl();
    if (!targetUrl) {
      return;
    }

    this.redirectingToAdmin = true;
    this.feedbackTone.set('success');
    this.feedback.set(this.translationService.translate('moderatorAccess.feedback.redirectingToAdmin'));

    window.setTimeout(() => {
      window.location.href = targetUrl;
    }, 1200);
  }

  private resolveAdminLoginFallbackUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const { origin, hostname, protocol, port } = window.location;
    if (port === '10201') {
      return `${protocol}//${hostname}:10202/login`;
    }

    if (origin.includes('localhost:4200')) {
      return 'http://localhost:60312/login';
    }

    return null;
  }

  protected iconPath(icon: string): string {
    switch (icon) {
      case 'plus':
        return 'M12 6.75v10.5M6.75 12h10.5';
      case 'pin':
        return 'M12 18.25s4.5-4.15 4.5-7.75a4.5 4.5 0 1 0-9 0c0 3.6 4.5 7.75 4.5 7.75Zm0-6a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z';
      case 'activity':
        return 'M5.5 12.5c1.2-1.3 2.3-1.3 3.5 0 1.2 1.3 2.3 1.3 3.5 0 1.2-1.3 2.3-1.3 3.5 0 1.2 1.3 2.3 1.3 3.5 0';
      case 'edit':
        return 'm7.25 16.75 6.8-6.8 2.5 2.5-6.8 6.8-3.25.45.75-2.95Zm7.45-8.95 1.05-1.05a1.77 1.77 0 1 1 2.5 2.5L17.2 10.3';
      case 'chart':
        return 'M6.5 17.5V9.75M12 17.5V6.5M17.5 17.5v-5.75M5 19h14';
      default:
        return '';
    }
  }
}
