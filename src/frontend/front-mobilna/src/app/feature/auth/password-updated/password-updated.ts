import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { LogoComponent } from '../../../shared/components/logo/logo';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
@Component({
  selector: 'app-password-updated',
  standalone: true,
  templateUrl: './password-updated.html',
  styleUrls: ['./password-updated.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [LogoComponent, TranslatePipe],
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
