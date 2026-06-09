import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, QueryList, ViewChildren, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type ForgotPasswordStep = 'email' | 'code' | 'password' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent implements OnDestroy {
  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);

  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly passwordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  step: ForgotPasswordStep = 'email';
  isLoading = false;
  message = '';
  errorMessage = '';
  showNewPassword = false;
  showConfirmPassword = false;

  resetEmail = '';
  private resetCode = '';
  private resetSessionToken = '';

  readonly digitIndexes = [0, 1, 2, 3, 4, 5];
  codeDigits: string[] = ['', '', '', '', '', ''];
  resendCountdown = 30;
  canResend = false;
  private countdownInterval: ReturnType<typeof setInterval> | undefined;

  get email() {
    return this.emailForm.get('email');
  }

  get code() {
    return this.codeForm.get('code');
  }

  get newPassword() {
    return this.passwordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.passwordForm.get('confirmPassword');
  }

  get resendCountdownFormatted(): string {
    const m = Math.floor(this.resendCountdown / 60).toString().padStart(2, '0');
    const s = (this.resendCountdown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.codeDigits[index] = digit;
    input.value = digit;

    this.codeForm.get('code')?.setValue(this.codeDigits.join(''));

    if (digit && index < 5) {
      const inputs = this.digitInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (!this.codeDigits[index] && index > 0) {
        this.codeDigits[index - 1] = '';
        this.codeForm.get('code')?.setValue(this.codeDigits.join(''));
        const inputs = this.digitInputs.toArray();
        inputs[index - 1]?.nativeElement.focus();
      } else {
        this.codeDigits[index] = '';
        this.codeForm.get('code')?.setValue(this.codeDigits.join(''));
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      const inputs = this.digitInputs.toArray();
      inputs[index - 1]?.nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      const inputs = this.digitInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }
  }

  onDigitPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
      this.codeDigits[i] = pasted[i] ?? '';
    }
    this.codeForm.get('code')?.setValue(this.codeDigits.join(''));
    const focusIndex = Math.min(pasted.length, 5);
    setTimeout(() => {
      const inputs = this.digitInputs.toArray();
      inputs[focusIndex]?.nativeElement.focus();
    });
  }

  private startCountdown(): void {
    this.resendCountdown = 30;
    this.canResend = false;
    clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(this.countdownInterval);
        this.canResend = true;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  resendCode(): void {
    if (!this.canResend || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .forgotPassword(this.resetEmail)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.codeDigits = ['', '', '', '', '', ''];
          this.codeForm.reset();
          this.startCountdown();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('forgotPassword.errors.unableToSend');
        },
      });
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
  }

  submitEmailStep(): void {
    if (this.emailForm.invalid || this.isLoading) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.message = '';

    const email = this.email?.value?.trim() ?? '';
    this.resetEmail = email;

    this.authService
      .forgotPassword(email)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.codeDigits = ['', '', '', '', '', ''];
          this.codeForm.reset();
          this.step = 'code';
          this.message = this.translationService.translate('forgotPassword.email.codeSentMessage');
          this.startCountdown();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('forgotPassword.errors.unableToSend');
          this.step = 'email';
          this.cdr.detectChanges();
        },
      });
  }

  submitCodeStep(): void {
    if (this.codeForm.invalid || this.isLoading) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.message = '';

    const code = this.code?.value?.trim() ?? '';

    this.authService
      .verifyResetCode({ email: this.resetEmail, code })
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: { resetSessionToken?: string; ResetSessionToken?: string; token?: string } | string) => {
          const resetSessionToken = this.extractResetSessionToken(response);

          if (!resetSessionToken) {
            this.errorMessage = this.translationService.translate('forgotPassword.errors.noToken');
            return;
          }

          this.resetCode = code;
          this.resetSessionToken = resetSessionToken;
          clearInterval(this.countdownInterval);
          this.step = 'password';
          this.passwordForm.reset();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('forgotPassword.errors.invalidCode');
        },
      });
  }

  submitPasswordStep(): void {
    if (this.passwordForm.invalid || this.isLoading) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.newPassword?.value ?? '';
    const confirmPassword = this.confirmPassword?.value ?? '';

    if (newPassword !== confirmPassword) {
      this.errorMessage = this.translationService.translate('forgotPassword.errors.passwordsDoNotMatch');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[\d\W]/.test(newPassword)) {
      this.errorMessage = this.translationService.translate('forgotPassword.errors.passwordRequirements');
      return;
    }

    if (!this.resetEmail || !this.resetCode || !this.resetSessionToken) {
      this.errorMessage = this.translationService.translate('forgotPassword.errors.sessionExpired');
      this.step = 'email';
      this.codeForm.reset();
      this.passwordForm.reset();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.message = '';

    this.authService
      .resetPassword(
        this.resetEmail,
        this.resetCode,
        newPassword,
        confirmPassword,
        this.resetSessionToken,
      )
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.step = 'success';
          this.message = this.translationService.translate('forgotPassword.success.subtitle');
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('forgotPassword.errors.unableToReset');
        },
      });
  }

  backToEmail(): void {
    if (this.isLoading) return;

    clearInterval(this.countdownInterval);
    this.step = 'email';
    this.errorMessage = '';
    this.message = '';
    this.codeDigits = ['', '', '', '', '', ''];
    this.codeForm.reset();
    this.passwordForm.reset();
  }

  backToCode(): void {
    if (this.isLoading) return;

    this.step = 'code';
    this.errorMessage = '';
    this.message = '';
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  private extractResetSessionToken(
    response: { resetSessionToken?: string; ResetSessionToken?: string; token?: string } | string | null | undefined,
  ): string {
    if (!response) return '';
    if (typeof response === 'string') return response;
    return response.resetSessionToken ?? response.ResetSessionToken ?? response.token ?? '';
  }
}
