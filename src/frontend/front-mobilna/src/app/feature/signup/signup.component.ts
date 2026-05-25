import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AppLanguage, TranslationService } from '../../services/translation.service';
import { LogoComponent } from '../../shared/components/logo/logo';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { GoogleIdentityService } from '../../services/google-identity';
import { environment } from '../../../environment/environment';

interface SignupLanguageOption {
  code: AppLanguage;
  labelKey: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LogoComponent, TranslatePipe],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  @ViewChild('googleButtonContainer') private googleButtonContainer?: ElementRef<HTMLElement>;

  private readonly phonePattern = /^\+?[0-9][0-9\s/-]{5,19}$/;
  showLanguageMenu = false;
  isLoading = false;
  errorMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  googleClientId: string | null = null;
  googleLoading = false;
  private viewReady = false;

  form;
  protected readonly languageOptions: SignupLanguageOption[];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService,
    private googleIdentityService: GoogleIdentityService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        dateOfBirth: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [this.optionalPhoneValidator.bind(this)]],
        country: ['', [Validators.maxLength(40)]],
        language: ['sr', Validators.required],
        password: [
          '',
          [Validators.required, Validators.minLength(8), this.passwordStrengthValidator],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator },
    );

    this.languageOptions = (['sr', 'en', 'es', 'it'] as AppLanguage[]).map((code) => ({
      code,
      labelKey: this.translationService.labelKeyForLanguage(code),
    }));

    this.loadGoogleAuthSettings();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.scheduleGoogleButtonRender();
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    return hasUpperCase && hasSpecialChar && hasNumber ? null : { weakPassword: true };
  }

  private optionalPhoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return this.phonePattern.test(value) ? null : { invalidPhone: true };
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) return null;

    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  togglePassword(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.hidePassword = !this.hidePassword;
      return;
    }

    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  languageLabel(option: SignupLanguageOption): string {
    return this.translationService.translate(option.labelKey);
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.showLanguageMenu = false;
  }
  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
  }

  selectLanguage(code: AppLanguage): void {
    this.form.patchValue({ language: code });
    this.showLanguageMenu = false;
    this.cdr.detectChanges();
  }

  getSelectedLanguageLabel(): string {
    const selected = this.languageOptions.find(opt => opt.code === this.form.value.language);
    return selected ? this.languageLabel(selected) : 'Srpski';
  }
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const dateOfBirthValue = this.form.value.dateOfBirth ?? '';
    const dateOfBirth = dateOfBirthValue ? `${dateOfBirthValue}T00:00:00Z` : '';

    this.authService
      .register({
        firstName: this.form.value.firstName?.trim() ?? '',
        lastName: this.form.value.lastName?.trim() ?? '',
        dateOfBirth,
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
        phoneNumber: this.form.value.phoneNumber?.trim() || null,
        country: this.form.value.country?.trim() || null,
        language: this.form.value.language ?? 'sr',
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message ?? 'Registration failed.';
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
    setTimeout(() => {
      void this.tryRenderGoogleButton();
    }, 0);
  }

  private async tryRenderGoogleButton(): Promise<void> {
    if (!this.viewReady || !this.googleClientId) {
      return;
    }

    if (!this.googleButtonContainer?.nativeElement) {
      this.scheduleGoogleButtonRender();
      return;
    }

    this.googleLoading = true;

    try {
      await this.googleIdentityService.renderButton(
        this.googleButtonContainer.nativeElement,
        this.googleClientId,
        (credential) => this.registerWithGoogle(credential),
        'signup_with',
      );
    } catch {
      this.googleClientId = null;
    } finally {
      this.googleLoading = false;
      this.cdr.detectChanges();
    }
  }

  private registerWithGoogle(idToken: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.loginWithGoogle({
      idToken,
      rememberMe: false,
      language: this.form.value.language ?? this.translationService.language(),
    }).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.requiresTwoFactor && response.twoFactorChallengeToken) {
          this.router.navigate(['/two-factor-verification'], {
            state: {
              challengeToken: response.twoFactorChallengeToken,
              deliveryTarget: response.twoFactorDeliveryTarget ?? '',
              email: '',
              expiresAt: response.twoFactorExpiresAt ?? null,
              returnUrl: '/home',
              openReview: false,
            },
          });
          return;
        }

        if (this.authService.getAuthenticatedRole() !== 'tourist') {
          this.errorMessage = this.translationService.translate('login.onlyTourists');
          this.authService.logout().subscribe();
          return;
        }

        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? this.translationService.translate('login.googleFailed');
      },
    });
  }
  goBack() {
    this.router.navigate(['/login']);
  }
  get firstName() {
    return this.form.get('firstName');
  }
  get lastName() {
    return this.form.get('lastName');
  }
  get dateOfBirth() {
    return this.form.get('dateOfBirth');
  }
  get email() {
    return this.form.get('email');
  }
  get phoneNumber() {
    return this.form.get('phoneNumber');
  }
  get country() {
    return this.form.get('country');
  }
  get language() {
    return this.form.get('language');
  }
  get password() {
    return this.form.get('password');
  }
  get confirmPassword() {
    return this.form.get('confirmPassword');
  }
}
