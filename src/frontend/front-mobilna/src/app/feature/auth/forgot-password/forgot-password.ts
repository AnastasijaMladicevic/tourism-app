import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LogoComponent],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPasswordComponent {
  form: any;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  get email() {
    return this.form.get('email');
  }
  submit() {
    if (this.form.valid) {
      console.log("Reset link sent to:", this.form.value.email);
      this.router.navigate(['/code-verification'], { state: { email: this.form.value.email } });

      // kasnije ide backend
    } else {
      this.form.markAllAsTouched();
    }
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}