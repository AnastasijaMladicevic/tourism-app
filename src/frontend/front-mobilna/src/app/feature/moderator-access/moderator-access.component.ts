import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, UserDto } from '../../services/auth';

@Component({
  selector: 'app-moderator-access',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './moderator-access.component.html',
  styleUrl: './moderator-access.component.scss',
})
export class ModeratorAccessComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackTone = signal<'success' | 'error'>('success');
  protected readonly creatorType = 'Moderator';

  protected user: UserDto | null = null;

  protected readonly requirements = [
    'Nalog treba da bude aktivan i uredno korišćen.',
    'Poželjno je da imate iskustva sa prijavama sadržaja i pravilima zajednice.',
    'Nakon prijave, administracija proverava zahtev i status naloga.',
  ];

  protected readonly responsibilities = [
    'Pregled prijavljenog sadržaja i osnovna moderacija objava.',
    'Brža komunikacija sa podrškom kada je potrebno reagovati.',
    'Doprinos kvalitetu i sigurnosti sadržaja unutar aplikacije.',
  ];

  protected readonly roleLabel = computed(() => {
    const roleName = this.user?.roleName?.trim();
    if (!roleName) return 'Turista';
    if (roleName === 'ContentCreator') return 'Moderator';
    if (roleName === 'Admin') return 'Administrator';
    if (roleName === 'Manager') return 'Menadžer';
    if (roleName === 'Tourist') return 'Turista';
    return roleName;
  });

  protected readonly canRequest = computed(() => {
    return !!this.user?.id && this.user?.roleName === 'Tourist' && !this.isSubmitting();
  });

  protected readonly statusBadge = computed(() => {
    if (this.user?.roleName === 'ContentCreator') return 'Pristup odobren';
    if (this.user?.roleName && this.user.roleName !== 'Tourist') return 'Posebna uloga aktivna';
    return 'Zahtev dostupan';
  });

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/profile']);
      return;
    }

    this.user = currentUser;

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
      });
  }

  protected submitRequest(): void {
    if (!this.user?.id || !this.canRequest()) return;

    this.isSubmitting.set(true);
    this.feedback.set('');

    this.authService
      .requestCreatorRole(this.user.id, this.creatorType)
      .pipe(
        catchError((error) => {
          const message = (error as { error?: { message?: string } })?.error?.message;
          this.feedbackTone.set('error');
          this.feedback.set(message || 'Zahtev trenutno nije moguće poslati.');
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;

        this.feedbackTone.set('success');
        this.feedback.set('Zahtev za pristup moderatoru je uspešno poslat.');
      });
  }
}
