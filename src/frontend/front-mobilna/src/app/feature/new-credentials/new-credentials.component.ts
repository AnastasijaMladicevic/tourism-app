import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, ChangePasswordDto } from '../../services/auth';
import { HeaderComponent } from '../header/header.component';

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
  imports: [HeaderComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './new-credentials.component.html',
  styleUrl: './new-credentials.component.scss',
})
export class NewCredentialsComponent {
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage = '';
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  readonly form = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.pattern(passwordStrengthRegex)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.errorMessage = 'Niste ulogovani. Prijavite se pa promenite lozinku.';
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
          this.errorMessage =
            err?.error?.message ||
            err?.error?.title ||
            'Promena lozinke nije uspela. Proveri unos i pokušaj ponovo.';
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

  toggleCurrentPassword(): void {
    this.hideCurrentPassword = !this.hideCurrentPassword;
  }

  toggleNewPassword(): void {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPassword(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  cancel(): void {
    this.location.back();
  }
}
