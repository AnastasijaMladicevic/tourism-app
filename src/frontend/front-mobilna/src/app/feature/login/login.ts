import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../shared/components/logo/logo';
import { AuthService } from '../../services/auth';
import { PendingActionService } from '../../services/pending-action';
import { RouterHistoryService } from '../../services/router-history';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { GoogleIdentityService } from '../../services/google-identity';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LogoComponent, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  @ViewChild('googleBtnContainer', { static: false }) googleBtnContainerRef?: ElementRef<HTMLDivElement>;

  form: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/home';
  googleClientId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private pendingActionService: PendingActionService,
    private routerHistory: RouterHistoryService,
    private translationService: TranslationService,
    private googleIdentityService: GoogleIdentityService,
  ) {
    this.returnUrl = this.readReturnUrl();
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, Validators.minLength(6), this.passwordStrengthValidator],
      ],
      rememberMe: [false],
    });

    this.loadGoogleAuthSettings();
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    return hasUpperCase && hasSpecialChar && hasNumber ? null : { weakPassword: true };
  }

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }
  get rememberMe() { return this.form.get('rememberMe'); }

  togglePassword(): void {
    this.hidePassword = !this.hidePassword;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.login();
  }

  login(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.form.value.email,
      password: this.form.value.password,
      rememberMe: this.form.value.rememberMe,
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.cdr.detectChanges();

        const role = response.user?.roleName?.toLowerCase();
        if (role && role !== 'tourist') {
          this.errorMessage = this.translationService.translate('login.onlyTourists');
          this.authService.logout().subscribe();
          this.cdr.detectChanges();
          return;
        }

        if (response.requiresTwoFactor) {
          if (response.twoFactorChallengeToken) {
            this.navigateToTwoFactorVerification(
              response.twoFactorChallengeToken,
              response.twoFactorDeliveryTarget ?? this.form.value.email,
              response.twoFactorExpiresAt,
            );
            return;
          }
          this.errorMessage = this.translationService.translate('twoFactor.invalidState');
          this.cdr.detectChanges();
          return;
        }

        this.handleSuccessfulTouristLogin();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? this.translationService.translate('login.invalidCredentials');
        this.cdr.detectChanges();
      },
    });
  }

  private loadGoogleAuthSettings(): void {
    this.authService.getPublicAuthSettings().subscribe({
      next: (settings) => {
        this.googleClientId = settings.googleClientId?.trim() || environment.googleClientId || null;
        this.cdr.detectChanges();
        this.scheduleGoogleButtonRender();
      },
      error: () => {
        this.googleClientId = environment.googleClientId || null;
        this.cdr.detectChanges();
        this.scheduleGoogleButtonRender();
      },
    });
  }

  private scheduleGoogleButtonRender(): void {
    if (!this.googleClientId) return;
    setTimeout(() => void this.renderGoogleButton(), 50);
  }

  private async renderGoogleButton(): Promise<void> {
    if (!this.googleClientId) return;
    const container = this.googleBtnContainerRef?.nativeElement
      ?? document.getElementById('google-btn-container') as HTMLDivElement | null;
    if (!container) return;

    try {
      await this.googleIdentityService.renderButton(
        container,
        this.googleClientId,
        (credential) => this.handleGoogleCredential(credential),
        'signin_with',
      );
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Google Sign-In render failed:', err);
    }
  }

  private handleGoogleCredential(idToken: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.loginWithGoogle({ idToken, rememberMe: false }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.cdr.detectChanges();

        const role = response.user?.roleName?.toLowerCase();
        if (role && role !== 'tourist') {
          this.errorMessage = this.translationService.translate('login.onlyTourists');
          this.authService.logout().subscribe();
          this.cdr.detectChanges();
          return;
        }

        this.handleSuccessfulTouristLogin();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? this.translationService.translate('login.invalidCredentials');
        this.cdr.detectChanges();
      },
    });
  }

  private executePendingAction(action: any): void {
    switch (action.type) {
      case 'favorite-object':
        window.dispatchEvent(new CustomEvent('favorite-object', { detail: action.payload }));
        break;
      case 'add-to-planner':
        window.dispatchEvent(new CustomEvent('add-to-planner', { detail: action.payload }));
        break;
    }
  }

  goBack(): void { this.routerHistory.goBack(); }
  goRegister(): void { this.router.navigate(['/register']); }
  goForgot(): void { this.router.navigate(['/forgot-password']); }
  goTerms(): void { this.router.navigate(['/terms']); }

  private handleSuccessfulTouristLogin(): void {
    const role = this.authService.getAuthenticatedRole();
    const currentUser = this.authService.getCurrentUser();

    if (role !== 'tourist') {
      this.errorMessage = this.translationService.translate('login.onlyTourists');
      this.authService.logout().subscribe({ complete: () => this.cdr.detectChanges() });
      this.cdr.detectChanges();
      return;
    }

    if (currentUser?.isBanned) {
      this.pendingActionService.clearAction();
      this.router.navigateByUrl('/home');
      return;
    }

    this.navigateAfterAuthenticatedLogin();
  }

  private navigateToTwoFactorVerification(
    challengeToken: string,
    deliveryTarget: string,
    expiresAt?: string | null,
  ): void {
    this.router.navigate(['/two-factor-verification'], {
      state: {
        challengeToken,
        deliveryTarget,
        email: this.form.value.email,
        expiresAt: expiresAt ?? null,
        returnUrl: this.readReturnUrl(),
        openReview: this.route.snapshot.queryParams['openReview'] === 'true',
      },
    });
  }

  private navigateAfterAuthenticatedLogin(): void {
    const returnUrl = this.readReturnUrl();
    const openReview = this.route.snapshot.queryParams['openReview'];
    const pending = this.pendingActionService.consumeAction();

    const finalUrl =
      openReview === 'true'
        ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}openReview=true`
        : returnUrl;

    if (pending) {
      this.router.navigateByUrl(finalUrl).then(() => {
        setTimeout(() => this.executePendingAction(pending), 100);
      });
      return;
    }

    this.router.navigateByUrl(finalUrl);
  }

  private readReturnUrl(): string {
    return this.route.snapshot.queryParams['returnUrl'] ||
      this.route.snapshot.queryParams['redirectTo'] ||
      '/home';
  }
}