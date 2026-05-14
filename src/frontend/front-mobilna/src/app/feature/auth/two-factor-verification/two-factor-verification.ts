import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth';
import { PendingActionService } from '../../../services/pending-action';
import { TranslationService } from '../../../services/translation.service';
import { LogoComponent } from '../../../shared/components/logo/logo';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

type PendingAction =
  | { type: 'favorite-object'; payload: unknown }
  | { type: 'add-to-planner'; payload: unknown };

interface TwoFactorNavigationState {
  challengeToken?: string;
  deliveryTarget?: string;
  email?: string;
  expiresAt?: string | null;
  returnUrl?: string;
  openReview?: boolean;
}

@Component({
  selector: 'app-two-factor-verification',
  standalone: true,
  imports: [CommonModule, LogoComponent, TranslatePipe],
  templateUrl: './two-factor-verification.html',
  styleUrls: ['./two-factor-verification.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TwoFactorVerificationComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  otpValues: string[] = ['', '', '', '', '', ''];
  timerDisplay = '0:00';
  isExpired = false;
  isLoading = false;
  isResending = false;
  errorMessage = '';
  successMessage = '';
  deliveryTarget = '';

  private challengeToken = '';
  private expiresAt: string | null = null;
  private readonly returnUrl: string;
  private readonly openReview: boolean;
  private timerInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private pendingActionService: PendingActionService,
    private translationService: TranslationService,
  ) {
    const state = history.state as TwoFactorNavigationState | undefined;

    this.challengeToken = state?.challengeToken?.trim() ?? '';
    this.deliveryTarget = state?.deliveryTarget?.trim() || state?.email?.trim() || '';
    this.expiresAt = state?.expiresAt ?? null;
    this.returnUrl = state?.returnUrl || '/home';
    this.openReview = state?.openReview === true;
  }

  ngOnInit(): void {
    if (!this.challengeToken) {
      this.router.navigate(['/login'], {
        queryParams: this.buildLoginQueryParams(),
      });
      return;
    }

    this.startTimer(this.expiresAt);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  get isOtpComplete(): boolean {
    return this.otpValues.every((value) => value !== '');
  }

  get otpCode(): string {
    return this.otpValues.join('');
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 1) {
      input.value = input.value.slice(-1);
    }

    this.otpValues[index] = input.value.replace(/\D/g, '');
    this.errorMessage = '';
    this.successMessage = '';

    if (input.value && index < 5) {
      this.otpInputs.toArray()[index + 1]?.nativeElement.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        this.otpInputs.toArray()[index - 1]?.nativeElement.focus();
        this.otpValues[index - 1] = '';
      } else {
        this.otpValues[index] = '';
      }
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      this.otpInputs.toArray()[index - 1]?.nativeElement.focus();
    }

    if (event.key === 'ArrowRight' && index < 5) {
      this.otpInputs.toArray()[index + 1]?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);

    this.otpInputs?.forEach((input) => {
      input.nativeElement.value = '';
    });

    digits.split('').forEach((char, index) => {
      this.otpValues[index] = char;
      const input = this.otpInputs.toArray()[index];
      if (input) {
        input.nativeElement.value = char;
      }
    });

    const focusIndex = digits.length > 0 ? Math.min(digits.length - 1, 5) : 0;
    this.otpInputs.toArray()[focusIndex]?.nativeElement.focus();
  }

  verifyCode(): void {
    if (!this.isOtpComplete) {
      this.errorMessage = this.translationService.translate('twoFactor.codeRequired');
      return;
    }

    if (this.isExpired) {
      this.errorMessage = this.translationService.translate('twoFactor.codeExpired');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .verifyTwoFactorLogin({
        challengeToken: this.challengeToken,
        code: this.otpCode.trim(),
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.handleSuccessfulTouristLogin();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err?.error?.message ?? this.translationService.translate('twoFactor.invalidCode');
          this.cdr.detectChanges();
        },
      });
  }

  resendCode(): void {
    if (!this.challengeToken || this.isResending) {
      return;
    }

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .resendTwoFactorLoginCode({ challengeToken: this.challengeToken })
      .subscribe({
        next: (response) => {
          this.isResending = false;
          this.challengeToken = response.twoFactorChallengeToken ?? this.challengeToken;
          this.deliveryTarget = response.twoFactorDeliveryTarget ?? this.deliveryTarget;
          this.expiresAt = response.twoFactorExpiresAt ?? this.expiresAt;
          this.resetOtpValues();
          this.startTimer(this.expiresAt);
          this.successMessage = this.translationService.translate('twoFactor.resendSuccess');
          this.cdr.detectChanges();
          this.otpInputs?.toArray()[0]?.nativeElement.focus();
        },
        error: (err) => {
          this.isResending = false;
          this.errorMessage =
            err?.error?.message ?? this.translationService.translate('twoFactor.resendFailed');
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/login'], {
      queryParams: this.buildLoginQueryParams(),
    });
  }

  private startTimer(expiresAt?: string | null): void {
    this.clearTimer();

    const parsedTarget = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    const targetTime = Number.isFinite(parsedTarget)
      ? parsedTarget
      : Date.now() + 5 * 60 * 1000;

    const update = () => {
      const secondsLeft = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
      this.isExpired = secondsLeft <= 0;
      this.timerDisplay = this.formatTimer(secondsLeft);

      if (this.isExpired) {
        this.clearTimer();
      }

      this.cdr.detectChanges();
    };

    update();

    this.timerInterval = setInterval(() => {
      this.ngZone.run(update);
    }, 1000);
  }

  private clearTimer(): void {
    if (!this.timerInterval) {
      return;
    }

    clearInterval(this.timerInterval);
    this.timerInterval = undefined;
  }

  private formatTimer(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private resetOtpValues(): void {
    this.otpValues = ['', '', '', '', '', ''];
    this.otpInputs?.forEach((input) => {
      input.nativeElement.value = '';
    });
  }

  private handleSuccessfulTouristLogin(): void {
    const role = this.authService.getAuthenticatedRole();

    if (role !== 'tourist') {
      this.errorMessage = this.translationService.translate('login.onlyTourists');

      this.authService.logout().subscribe({
        complete: () => {
          this.router.navigate(['/login'], {
            queryParams: this.buildLoginQueryParams(),
          });
        },
      });
      this.cdr.detectChanges();
      return;
    }

    this.navigateAfterAuthenticatedLogin();
  }

  private navigateAfterAuthenticatedLogin(): void {
    const pending = this.pendingActionService.consumeAction() as PendingAction | null;
    const finalUrl = this.openReview
      ? `${this.returnUrl}${this.returnUrl.includes('?') ? '&' : '?'}openReview=true`
      : this.returnUrl;

    if (pending) {
      this.router.navigateByUrl(finalUrl).then(() => {
        setTimeout(() => {
          this.executePendingAction(pending);
        }, 100);
      });
      return;
    }

    this.router.navigateByUrl(finalUrl);
  }

  private executePendingAction(action: PendingAction): void {
    switch (action.type) {
      case 'favorite-object':
        window.dispatchEvent(new CustomEvent('favorite-object', { detail: action.payload }));
        break;
      case 'add-to-planner':
        window.dispatchEvent(new CustomEvent('add-to-planner', { detail: action.payload }));
        break;
    }
  }

  private buildLoginQueryParams(): Record<string, string> {
    return {
      returnUrl: this.returnUrl,
      ...(this.openReview ? { openReview: 'true' } : {}),
    };
  }
}
