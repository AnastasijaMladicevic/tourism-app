import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, timeout } from 'rxjs';

import { AuthService, TwoFactorSettingsDto } from '../../services/auth';
import { RouterHistoryService } from '../../services/router-history';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-two-factor-settings',
  templateUrl: './two-factor-settings.html',
  styleUrls: ['./two-factor-settings.scss'],
  imports: [CommonModule, MatIconModule, TranslatePipe, FormsModule],
})
export class TwoFactorSettingsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  isLoading = true;
  isSaving = false;
  isEnabled = false;
  deliveryMethod = 'email';
  maskedEmailAddress = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private routerHistoryService: RouterHistoryService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.hydrateFromCurrentUser();
    this.loadSettingsInBackground();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  setTwoFactorEnabled(newValue: boolean): void {
    if (this.isLoading || this.isSaving || this.isEnabled === newValue) {
      return;
    }

    const previousValue = this.isEnabled;
    this.isEnabled = newValue;
    this.isSaving = true;
    this.errorMessage = '';

    this.subscriptions.add(
      this.authService.updateMyTwoFactorSettings(newValue).subscribe({
        next: (settings) => {
          this.applySettings(settings);
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isEnabled = previousValue;
          this.isSaving = false;
          this.errorMessage = this.translationService.translate('settings.twoFactorSaveError');
        },
      })
    );
  }

  private hydrateFromCurrentUser(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isEnabled = !!currentUser?.isTwoFactorEnabled;
    this.deliveryMethod = 'email';
    this.maskedEmailAddress =
      this.maskEmailAddress(currentUser?.email) ||
      this.translationService.translate('common.emailNotAvailable');
    this.isLoading = false;
  }

  private loadSettingsInBackground(): void {
    this.errorMessage = '';

    this.subscriptions.add(
      this.authService.getMyTwoFactorSettings().pipe(timeout(5000)).subscribe({
        next: (settings) => {
          this.applySettings(settings);
        },
        error: () => {
          if (!this.maskedEmailAddress) {
            this.errorMessage = this.translationService.translate('settings.twoFactorSaveError');
          }
        },
      }),
    );
  }

  private applySettings(settings: TwoFactorSettingsDto): void {
    this.isEnabled = settings.isEnabled;
    this.deliveryMethod = settings.deliveryMethod || 'email';
    this.maskedEmailAddress =
      settings.maskedEmailAddress ||
      this.authService.getCurrentUser()?.email ||
      this.translationService.translate('common.emailNotAvailable');
  }

  private maskEmailAddress(email?: string | null): string {
    if (!email) {
      return '';
    }

    const parts = email.split('@');
    if (parts.length !== 2) {
      return email;
    }

    const [localPart, domain] = parts;
    if (localPart.length <= 2) {
      return `${localPart[0] ?? '*'}*@${domain}`;
    }

    return `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 2, 1))}${localPart[localPart.length - 1]}@${domain}`;
  }
}
