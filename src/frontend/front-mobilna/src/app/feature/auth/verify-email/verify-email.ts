import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LogoComponent } from '../../../shared/components/logo/logo';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthService } from '../../../services/auth';

type VerifyEmailStatus = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [LogoComponent, TranslatePipe],
})
export class VerifyEmailComponent implements OnInit {
  status: VerifyEmailStatus = 'loading';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];

    if (!token) {
      this.status = 'error';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.status = 'success';
      },
      error: (err) => {
        this.status = 'error';
        this.errorMessage = err?.error?.message ?? '';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
