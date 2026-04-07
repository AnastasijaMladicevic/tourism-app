import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;

  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
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
    }).subscribe({
      next: () => {
        this.isLoading = false;
        //TODO add dashboard depending on user role
        // this.router.navigate(['/dashboard']);
        alert("Login successfull!");
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message ?? 'Invalid email or password.';
        alert(error?.error?.message); 
      },
    });
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }

  goSignout(): void {
    this.router.navigate(['/signout']);
  }
}
