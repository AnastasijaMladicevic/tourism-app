import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-signout',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './signout.html',
  styleUrl: './signout.css',
})
export class Signout {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  confirmSignOut(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  cancel(): void {
    this.router.navigateByUrl(this.authService.getDashboardRouteFromStoredUser());
  }
}
