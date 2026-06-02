import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
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

interface DatePickerCell {
  key: string;
  label: number;
  date: Date;
  isCurrentMonth: boolean;
  isDisabled: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LogoComponent, TranslatePipe],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent implements OnDestroy {
  private readonly phonePattern = /^\+?[0-9][0-9\s/-]{5,19}$/;

  @ViewChild('countryDropdown') private countryDropdownEl?: ElementRef<HTMLElement>;
  @ViewChild('datePickerWrap') private datePickerWrapEl?: ElementRef<HTMLElement>;

  showLanguageMenu = false;
  showCountryMenu = false;
  showDatePicker = false;
  isLoading = false;

  private datePickerMonthCursor: Date = new Date();
  datePickerDraft = '';
  datePickerWeeks: DatePickerCell[][] = [];

  readonly countryOptions: string[] = [
    'Albania', 'Argentina', 'Australia', 'Austria', 'Belgium',
    'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Canada', 'China',
    'Croatia', 'Czech Republic', 'Denmark', 'Finland', 'France',
    'Germany', 'Greece', 'Hungary', 'India', 'Italy',
    'Japan', 'Kosovo', 'Mexico', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
    'Russia', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
    'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',
    'United States',
  ];
  errorMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  googleClientId: string | null = null;
  private googlePopupListener: ((e: MessageEvent) => void) | null = null;
  private googlePopupCheckInterval: ReturnType<typeof setInterval> | null = null;

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
  onDocumentClick(event: MouseEvent): void {
    this.showLanguageMenu = false;
    if (this.showCountryMenu && !this.countryDropdownEl?.nativeElement.contains(event.target as Node)) {
      this.showCountryMenu = false;
    }
    if (this.showDatePicker && !this.datePickerWrapEl?.nativeElement.contains(event.target as Node)) {
      this.showDatePicker = false;
    }
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
  }

  selectLanguage(code: AppLanguage): void {
    this.form.patchValue({ language: code });
    this.translationService.setLanguage(code);
    this.showLanguageMenu = false;
    this.cdr.detectChanges();
  }

  getSelectedLanguageLabel(): string {
    const selected = this.languageOptions.find(opt => opt.code === this.form.value.language);
    return selected ? this.languageLabel(selected) : 'Srpski';
  }

  toggleCountryMenu(event: Event): void {
    event.stopPropagation();
    this.showCountryMenu = !this.showCountryMenu;
  }

  selectCountry(option: string): void {
    this.form.patchValue({ country: option });
    this.showCountryMenu = false;
    this.cdr.detectChanges();
  }

  getSelectedCountryLabel(): string {
    return this.form.value.country || '';
  }

  get formattedDateOfBirth(): string {
    const value = this.form.value.dateOfBirth;
    if (!value) return '';
    const [y, m, d] = (value as string).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
  }

  get datePickerMonthLabel(): string {
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      month: 'long', year: 'numeric',
    }).format(this.datePickerMonthCursor);
  }

  get canGoToPrevDatePickerMonth(): boolean {
    return this.datePickerMonthCursor.getFullYear() > 1920;
  }

  get canGoToNextDatePickerMonth(): boolean {
    const today = new Date();
    const c = this.datePickerMonthCursor;
    return c.getFullYear() < today.getFullYear() ||
      (c.getFullYear() === today.getFullYear() && c.getMonth() < today.getMonth());
  }

  toggleDatePicker(event: Event): void {
    event.stopPropagation();
    if (!this.showDatePicker) {
      const current = this.form.value.dateOfBirth as string | undefined;
      if (current) {
        const [y, m] = current.split('-').map(Number);
        this.datePickerMonthCursor = new Date(y, m - 1, 1);
      } else {
        const today = new Date();
        this.datePickerMonthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
      }
      this.datePickerDraft = current ?? '';
      this.refreshDatePickerWeeks();
    }
    this.showDatePicker = !this.showDatePicker;
  }

  prevDatePickerMonth(): void {
    if (!this.canGoToPrevDatePickerMonth) return;
    const prev = new Date(this.datePickerMonthCursor);
    prev.setMonth(prev.getMonth() - 1);
    this.datePickerMonthCursor = new Date(prev.getFullYear(), prev.getMonth(), 1);
    this.refreshDatePickerWeeks();
  }

  nextDatePickerMonth(): void {
    if (!this.canGoToNextDatePickerMonth) return;
    const next = new Date(this.datePickerMonthCursor);
    next.setMonth(next.getMonth() + 1);
    this.datePickerMonthCursor = new Date(next.getFullYear(), next.getMonth(), 1);
    this.refreshDatePickerWeeks();
  }

  selectDatePickerDay(cell: DatePickerCell): void {
    if (cell.isDisabled) return;
    this.datePickerDraft = cell.key;
    this.refreshDatePickerWeeks();
  }

  confirmDatePicker(): void {
    if (this.datePickerDraft) {
      this.form.patchValue({ dateOfBirth: this.datePickerDraft });
      this.form.get('dateOfBirth')?.markAsTouched();
    }
    this.showDatePicker = false;
  }

  clearDatePicker(): void {
    this.datePickerDraft = '';
    this.refreshDatePickerWeeks();
  }

  private refreshDatePickerWeeks(): void {
    const monthStart = this.datePickerMonthCursor;
    const firstGrid = new Date(monthStart);
    firstGrid.setDate(monthStart.getDate() - monthStart.getDay());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks: DatePickerCell[][] = [];

    for (let w = 0; w < 6; w++) {
      const week: DatePickerCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(firstGrid);
        cellDate.setDate(firstGrid.getDate() + w * 7 + d);
        const normalized = new Date(cellDate);
        normalized.setHours(0, 0, 0, 0);
        const key = this.toDateKey(cellDate);
        week.push({
          key,
          label: cellDate.getDate(),
          date: cellDate,
          isCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
          isDisabled: normalized > today,
          isSelected: key === this.datePickerDraft,
        });
      }
      weeks.push(week);
    }
    this.datePickerWeeks = weeks;
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  ngOnDestroy(): void {
    this.cleanupGooglePopup();
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

    const popup = window.open(url.toString(), 'google-signup', 'width=500,height=620,top=100,left=200');

    this.googlePopupListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'google-id-token') return;
      this.cleanupGooglePopup();
      const idToken = event.data.idToken as string;
      if (idToken) this.registerWithGoogle(idToken);
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
