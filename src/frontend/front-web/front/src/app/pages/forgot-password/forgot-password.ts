import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
export class ForgotPasswordComponent {
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
      }))
      .subscribe({
        next: () => {
          this.step = 'code';
          this.message = this.translationService.translate('forgotPassword.email.codeSentMessage');
          this.codeForm.reset();
          this.cdr.detectChanges();
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
          this.step = 'password';
          this.passwordForm.reset();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('forgotPassword.errors.invalidCode');
          this.cdr.detectChanges();
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
      }))
      .subscribe({
        next: () => {
          this.step = 'success';
          this.message = this.translationService.translate('forgotPassword.success.subtitle');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('forgotPassword.errors.unableToReset');
          this.cdr.detectChanges();
        },
      });
  }

  backToEmail(): void {
    if (this.isLoading) {
      return;
    }

    this.step = 'email';
    this.errorMessage = '';
    this.message = '';
    this.codeForm.reset();
    this.passwordForm.reset();
  }

  backToCode(): void {
    if (this.isLoading) {
      return;
    }

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
    if (!response) {
      return '';
    }

    if (typeof response === 'string') {
      return response;
    }

    return response.resetSessionToken ?? response.ResetSessionToken ?? response.token ?? '';
  }
}
