import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
export class LoginComponent implements OnDestroy {
  form: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/home';
  googleClientId: string | null = null;
  private googlePopupListener: ((e: MessageEvent) => void) | null = null;
  private googlePopupCheckInterval: ReturnType<typeof setInterval> | null = null;

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

  signInWithGoogle(): void {
    if (!this.googleClientId) return;

    const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.googleClientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'id_token');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('prompt', 'select_account');

    this.cleanupGooglePopup();

    const popup = window.open(url.toString(), 'google-signin', 'width=500,height=620,top=100,left=200');

    this.googlePopupListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'google-id-token') return;
      this.cleanupGooglePopup();
      const idToken = event.data.idToken as string;
      if (idToken) this.handleGoogleCredential(idToken);
    };

    window.addEventListener('message', this.googlePopupListener);

    this.googlePopupCheckInterval = setInterval(() => {
      if (popup?.closed) this.cleanupGooglePopup();
    }, 1000);
  }

  private cleanupGooglePopup(): void {
    if (this.googlePopupListener) {
      window.removeEventListener('message', this.googlePopupListener);
      this.googlePopupListener = null;
    }
    if (this.googlePopupCheckInterval) {
      clearInterval(this.googlePopupCheckInterval);
      this.googlePopupCheckInterval = null;
    }
  }

  private loadGoogleAuthSettings(): void {
    this.authService.getPublicAuthSettings().subscribe({
      next: (settings) => {
        this.googleClientId = settings.googleClientId?.trim() || environment.googleClientId || null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.googleClientId = environment.googleClientId || null;
        this.cdr.detectChanges();
      },
    });
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

  ngOnDestroy(): void {
    this.cleanupGooglePopup();
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