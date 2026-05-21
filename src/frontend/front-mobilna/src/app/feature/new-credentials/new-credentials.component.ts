import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, ChangePasswordDto } from '../../services/auth';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

const passwordStrengthRegex = /^(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value ?? '';
  const confirmPassword = control.get('confirmPassword')?.value ?? '';
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-new-credentials',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslatePipe],
  templateUrl: './new-credentials.component.html',
  styleUrl: './new-credentials.component.scss',
})
export class NewCredentialsComponent {
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  email = '';
  code = '';
  isForgotFlow = false;
  isLoading = false;
  errorMessage = '';
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  resetSessionToken = '';

  constructor(
    private translationService: TranslationService
  ) { }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] ?? '';
    this.code = history.state?.code ?? '';
    this.isForgotFlow = !!this.email;
    this.resetSessionToken = history.state?.resetSessionToken ?? '';
    this.updateCurrentPasswordValidator();
  }
  readonly form = this.fb.group(
    {
      currentPassword: [''],
      newPassword: ['', [Validators.required, Validators.pattern(passwordStrengthRegex)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  private updateCurrentPasswordValidator(): void {
    const currentPasswordControl = this.form.controls.currentPassword;
    if (this.isForgotFlow) {
      currentPasswordControl.clearValidators();
    } else {
      currentPasswordControl.setValidators([Validators.required]);
    }

    currentPasswordControl.updateValueAndValidity({ emitEvent: false });
  }

  get newPasswordValue(): string {
    return this.form.controls.newPassword.value ?? '';
  }

  get ruleMinLength(): boolean {
    return this.newPasswordValue.length >= 8;
  }

  get ruleUppercase(): boolean {
    return /[A-Z]/.test(this.newPasswordValue);
  }

  get ruleNumberOrSpecial(): boolean {
    return /[\d\W]/.test(this.newPasswordValue);
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    // Forgot password flow
    if (this.isForgotFlow) {
      this.isLoading = true;
      this.authService.resetPassword(
        this.email,
        this.code,
        this.form.controls.newPassword.value ?? '',
        this.form.controls.confirmPassword.value ?? '',
        this.resetSessionToken
      ).pipe(
        catchError(err => {
          this.errorMessage = err?.error?.message ?? 'newCredentials.errors.resetFailed';
          setTimeout(() => this.cdr.detectChanges());
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          setTimeout(() => this.cdr.detectChanges())
        })
      ).subscribe(res => {
        if (!res) return;
        this.router.navigate(['/password-updated']);
      });
      return;
    }

    // Postojeći change password flow...
    const user = this.authService.getCurrentUser();
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!user?.id) {
      this.errorMessage = 'newCredentials.errors.notLoggedIn';
      return;
    }

    const dto: ChangePasswordDto = {
      currentPassword: this.form.controls.currentPassword.value ?? '',
      newPassword: this.form.controls.newPassword.value ?? '',
      confirmPassword: this.form.controls.confirmPassword.value ?? '',
    };

    this.isLoading = true;
    this.authService
      .changePassword(user.id, dto)
      .pipe(
        catchError((err) => {
          this.errorMessage = err?.error?.message || err?.error?.title || 'newCredentials.errors.changeFailed';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe((res) => {
        if (!res) return;
        this.router.navigate(['/password-updated']);
      });
  }

  toggleNewPassword(): void {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleCurrentPassword(): void {
    this.hideCurrentPassword = !this.hideCurrentPassword;
  }

  toggleConfirmPassword(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  cancel(): void {
    this.location.back();
  }

  openForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
