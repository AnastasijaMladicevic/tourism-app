import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  constructor(private router: Router) {}

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