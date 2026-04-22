import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, UserDto } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-moderator-access',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './moderator-access.component.html',
  styleUrl: './moderator-access.component.scss',
})
export class ModeratorAccessComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackTone = signal<'success' | 'error'>('success');
  protected readonly creatorType = 'Moderator';

  protected user: UserDto | null = null;

  protected readonly requirementKeys = [
    'moderator.req.1',
    'moderator.req.2',
    'moderator.req.3',
  ];

  protected readonly responsibilityKeys = [
    'moderator.resp.1',
    'moderator.resp.2',
    'moderator.resp.3',
  ];

  protected readonly roleLabel = computed(() => {
    const roleName = this.user?.roleName?.trim();
    if (!roleName || roleName === 'Tourist') return this.translationService.translate('moderator.role.tourist');
    if (roleName === 'ContentCreator') return this.translationService.translate('moderator.role.moderator');
    if (roleName === 'Admin') return this.translationService.translate('moderator.role.admin');
    if (roleName === 'Manager') return this.translationService.translate('moderator.role.manager');
    return roleName;
  });

  protected readonly canRequest = computed(() => {
    return !!this.user?.id && this.user?.roleName === 'Tourist' && !this.isSubmitting();
  });

  protected readonly statusBadge = computed(() => {
    if (this.user?.roleName === 'ContentCreator') return this.translationService.translate('moderator.badge.approved');
    if (this.user?.roleName && this.user.roleName !== 'Tourist') return this.translationService.translate('moderator.badge.activeRole');
    return this.translationService.translate('moderator.badge.available');
  });

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/profile']);
      return;
    }

    this.user = currentUser;

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
      });
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
          this.feedback.set(message || this.translationService.translate('moderator.requestFailed'));
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;

        this.feedbackTone.set('success');
        this.feedback.set(this.translationService.translate('moderator.requestSent'));
      });
  }

  protected translate(key: string): string {
    return this.translationService.translate(key);
  }
}
