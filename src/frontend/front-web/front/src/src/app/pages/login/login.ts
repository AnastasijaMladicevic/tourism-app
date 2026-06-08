import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  isShaking = false;

  private shakeTimer: ReturnType<typeof setTimeout> | null = null;

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  private triggerShake() {
    if (this.shakeTimer) clearTimeout(this.shakeTimer);
    this.isShaking = false;
    setTimeout(() => {
      this.isShaking = true;
      this.shakeTimer = setTimeout(() => { this.isShaking = false; }, 700);
    }, 10);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
      this.triggerShake();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password, rememberMe } = this.form.getRawValue();

    this.authService.login({
      email: email ?? '',
      password: password ?? '',
      rememberMe: !!rememberMe,
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        const role = this.authService.getNormalizedRole(response.user);

        if (role === 'tourist') {
          this.authService.logout();
          this.errorMessage = `${role} ${this.translationService.translate('login.portalComingSoon')}`;
          this.triggerShake();
          return;
        }

        if (response.isBanned && role === 'content-creator') {
          this.router.navigateByUrl(this.authService.getAccountBannedRoute());
          return;
        }

        const targetRoute = this.authService.getDashboardRouteForRole(role);
        this.router.navigateByUrl(targetRoute);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('login.invalidCredentials');
        this.triggerShake();
      },
    });
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  ngOnDestroy() {
    if (this.shakeTimer) clearTimeout(this.shakeTimer);
  }
}
