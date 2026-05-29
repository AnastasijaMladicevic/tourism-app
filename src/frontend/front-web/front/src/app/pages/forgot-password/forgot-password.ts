import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

type ForgotPasswordStep = 'email' | 'code' | 'password' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

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
    this.step = 'code';
    this.message = 'Demo mode: enter any 6-digit code to continue.';
    this.codeForm.reset();
    this.isLoading = false;
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
    this.resetCode = code;
    this.resetSessionToken = 'demo-reset-session';
    this.step = 'password';
    this.passwordForm.reset();
    this.isLoading = false;
  }

  submitPasswordStep(): void {
    if (this.passwordForm.invalid || this.isLoading) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.newPassword?.value ?? '';
    const confirmPassword = this.confirmPassword?.value ?? '';

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[\d\W]/.test(newPassword)) {
      this.errorMessage = 'Password must include one uppercase letter and one number or symbol.';
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
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.step = 'success';
          this.message = 'Your password has been reset successfully.';
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Unable to reset password.';
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
}
