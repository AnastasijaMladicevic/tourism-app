import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HeaderComponent } from '../header/header.component';
import { LogoComponent } from '../header/logo.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent, LogoComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  isLoading = false;
  errorMessage = '';

  form;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      country: [''],
      language: ['sr', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator });
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    return hasUpperCase && hasSpecialChar && hasNumber ? null : { weakPassword: true };
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) return null;

    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fullName = this.form.value.fullName?.trim() ?? '';
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

    this.isLoading = true;
    this.errorMessage = '';

    const dateOfBirthValue = this.form.value.dateOfBirth ?? '';
    const dateOfBirth = dateOfBirthValue ? `${dateOfBirthValue}T00:00:00Z` : '';

    this.authService.register({
      firstName,
      lastName,
      dateOfBirth,
      email: this.form.value.email ?? '',
      password: this.form.value.password ?? '',
      phoneNumber: this.form.value.phoneNumber?.trim() || null,
      country: this.form.value.country?.trim() || null,
      language: this.form.value.language ?? 'sr',
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Registration failed.';
      }
    });
  }

  get fullName() { return this.form.get('fullName'); }
  get dateOfBirth() { return this.form.get('dateOfBirth'); }
  get email() { return this.form.get('email'); }
  get phoneNumber() { return this.form.get('phoneNumber'); }
  get country() { return this.form.get('country'); }
  get language() { return this.form.get('language'); }
  get password() { return this.form.get('password'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }
}
