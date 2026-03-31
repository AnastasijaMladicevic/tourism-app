import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        this.passwordStrengthValidator
      ]]
    });
  }
  hidePassword = true;
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const valid = hasUpperCase && hasSpecialChar && hasNumber;
    return valid ? null : { weakPassword: true };
  }

  submit() {
    if (this.form.valid) {
      this.login()
    } else {
      console.log('Forma nije validna');
    }
  }
  get email() {
    return this.form.get('email');
  }
  get password() {
    return this.form.get('password');
  }
  togglePassword() {
    this.hidePassword = !this.hidePassword;
  }
  login() {
    if (this.form.valid) {
      console.log("Login data:", this.form.value);
      setTimeout(() => {
        this.goHome();
      }, 500);
    } else {
      this.form.markAllAsTouched();
    }
  }
  goHome() {
    this.router.navigate(['/home']);
  }

  goRegister() {
    this.router.navigate(['/register']);
  }

  goForgot() {
    this.router.navigate(['/forgot-password']);
  }

  goTerms() {
    this.router.navigate(['/terms']);
  }
}