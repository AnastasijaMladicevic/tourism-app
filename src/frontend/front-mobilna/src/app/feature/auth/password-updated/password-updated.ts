import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-password-updated',
  standalone: true,
  templateUrl: './password-updated.html',
  styleUrls: ['./password-updated.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PasswordUpdatedComponent {

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/new-credentials']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
