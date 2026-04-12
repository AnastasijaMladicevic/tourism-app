import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';

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
  private readonly cdr = inject(ChangeDetectorRef);

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
          this.errorMessage = `${role} portal is coming soon. Please check back later.`;
          return;
        }

        const targetRoute = this.authService.getDashboardRouteForRole(role);
        this.router.navigateByUrl(targetRoute);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Invalid email or password.';
        return;
      },
    });
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }
}
