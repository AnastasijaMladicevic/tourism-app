import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../../shared/components/logo/logo';
import { AuthService } from '../../../services/auth';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LogoComponent, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPasswordComponent {
  form: any;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  get email() {
    return this.form.get('email');
  }
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/code-verification'], {
          state: { email: this.form.value.email }
        });
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'forgotPassword.errors.generic';
      }
    });
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
