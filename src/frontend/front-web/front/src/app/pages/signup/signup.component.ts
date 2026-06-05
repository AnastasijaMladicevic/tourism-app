import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslatePipe],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
firstName = '';
lastName = '';
dateOfBirth = '';
email = '';
password = '';
confirmPassword = '';
phoneNumber = '';
country = '';
language = '';
errorMessage = '';
successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  private readonly translationService = inject(TranslationService);

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
  constructor(private authService: AuthService, private router: Router) {}

  onSignUp() {
  if (this.password !== this.confirmPassword) {
    this.errorMessage = this.translationService.translate('signup.passwordsDoNotMatch');
    return;
  }

  this.authService.register({
    firstName: this.firstName,
    lastName: this.lastName,
    dateOfBirth: this.dateOfBirth,
    email: this.email,
    password: this.password,
    phoneNumber: this.phoneNumber,
    country: this.country,
    language: this.language
  }).subscribe({
    next: () => {
      this.successMessage = this.translationService.translate('signup.registrationSuccessful');
      setTimeout(() => this.router.navigate(['/login']), 1500);
    },
    error: (err) => {
      this.errorMessage = err.error?.message || this.translationService.translate('signup.registrationFailed');
    }
  });
}
}
