import { Component } from '@angular/core';
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
import { ChangeDetectorRef } from '@angular/core';
import { PendingActionService } from '../../services/pending-action';
import { RouterHistoryService } from '../../services/router-history';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LogoComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  form: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/home';
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private pendingActionService: PendingActionService,
    private routerHistory: RouterHistoryService
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, Validators.minLength(6), this.passwordStrengthValidator],
      ],
      rememberMe: [false]
    });
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    return hasUpperCase && hasSpecialChar && hasNumber ? null : { weakPassword: true };
  }

  get email() {
    return this.form.get('email');
  }
  get password() {
    return this.form.get('password');
  }
  get rememberMe() {
    return this.form.get('rememberMe');
  }
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .login({
        email: this.form.value.email,
        password: this.form.value.password,
        rememberMe: this.form.value.rememberMe,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
          const role = this.authService.getAuthenticatedRole();

          if (role !== 'tourist') {
            this.errorMessage = 'Only tourists can log in here.';

            this.authService.logout().subscribe({
              complete: () => {
                this.cdr.detectChanges();
              }
            });
            this.cdr.detectChanges();
            return;
          }
          const returnUrl =
            this.route.snapshot.queryParams['returnUrl'] || '/home';

          const openReview =
            this.route.snapshot.queryParams['openReview'];

          const pending = this.pendingActionService.consumeAction();

          const finalUrl =
            openReview === 'true'
              ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}openReview=true`
              : returnUrl;

          if (pending) {
            this.router.navigateByUrl(finalUrl).then(() => {
              setTimeout(() => {
                this.executePendingAction(pending);
              }, 100);
            });
            return;
          }

          this.router.navigateByUrl(finalUrl);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message ?? 'Invalid email or password.';
          this.cdr.detectChanges();
        },
      });
  }
  private executePendingAction(action: any): void {
    switch (action.type) {
      case 'favorite-object':
        window.dispatchEvent(
          new CustomEvent('favorite-object', { detail: action.payload })
        );
        break;

      case 'add-to-planner':
        window.dispatchEvent(
          new CustomEvent('add-to-planner', { detail: action.payload })
        );
        break;
    }
  }
  goBack(): void {
    this.routerHistory.goBack();
  }
  goRegister(): void {
    this.router.navigate(['/register']);
  }
  goForgot(): void {
    this.router.navigate(['/forgot-password']);
  }
  goTerms(): void {
    this.router.navigate(['/terms']);
  }
}
