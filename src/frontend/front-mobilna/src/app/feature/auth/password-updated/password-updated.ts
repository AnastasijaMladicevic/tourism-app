import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { LogoComponent } from '../../../shared/components/logo/logo';
@Component({
  selector: 'app-password-updated',
  standalone: true,
  templateUrl: './password-updated.html',
  styleUrls: ['./password-updated.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [LogoComponent],
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
