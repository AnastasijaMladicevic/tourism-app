import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, UserDto } from '../../services/auth';

@Component({
  selector: 'app-moderator-access-preview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './moderator-access-preview.component.html',
  styleUrl: './moderator-access-preview.component.scss',
})
export class ModeratorAccessPreviewComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackTone = signal<'success' | 'error'>('success');
  protected readonly hasRequested = signal(false);
  protected readonly creatorType = 'Moderator';

  protected user: UserDto | null = null;

  protected readonly privileges = [
    {
      icon: 'plus',
      title: 'Dodavanje dogadaja',
      body: 'Objavljujte nove lokalne manifestacije i festivale.',
    },
    {
      icon: 'pin',
      title: 'Dodavanje i izmena objekata',
      body: 'Kreirajte i izmenite nove lokacije i restorane na mapi.',
    },
    {
      icon: 'activity',
      title: 'Upravljanje aktivnostima',
      body: 'Dodajte nove ture i sportske aktivnosti.',
    },
    {
      icon: 'edit',
      title: 'Uredjivanje detalja dogadaja',
      body: 'Kreirajte i izmenite nove dogadaje na mapi.',
    },
    {
      icon: 'chart',
      title: 'Pristup analitici',
      body: 'Pratite posecenost i popularnost vasih objava.',
    },
  ];

  protected readonly roleLabel = computed(() => {
    const roleName = this.user?.roleName?.trim();
    if (!roleName || roleName === 'Tourist') return 'Turista';
    if (roleName === 'ContentCreator') return 'Moderator';
    if (roleName === 'Admin') return 'Administrator';
    if (roleName === 'Manager') return 'Menadzer';
    return roleName;
  });

  protected readonly canRequest = computed(() => {
    return !!this.user?.id && this.user?.roleName === 'Tourist' && !this.isSubmitting() && !this.hasRequested();
  });

  protected readonly statusLabel = computed(() => {
    if (this.hasRequested()) return 'Zahtev je poslat';
    if (this.user?.roleName === 'ContentCreator') return 'Pristup odobren';
    if (this.user?.roleName && this.user.roleName !== 'Tourist') return 'Posebna uloga aktivna';
    return 'Nije zatrazeno';
  });

  protected readonly requestButtonLabel = computed(() => {
    if (this.isSubmitting()) return 'Slanje zahteva...';
    if (this.hasRequested()) return 'Zahtev je poslat';
    return 'Zatrazi pristup';
  });

  constructor() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = currentUser;
    this.hasRequested.set(sessionStorage.getItem(this.requestStorageKey(currentUser.id)) === 'sent');

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        this.hasRequested.set(sessionStorage.getItem(this.requestStorageKey(user.id)) === 'sent');
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
          this.feedback.set(message || 'Zahtev trenutno nije moguce poslati.');
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe((result) => {
        if (!result || !this.user?.id) return;

        sessionStorage.setItem(this.requestStorageKey(this.user.id), 'sent');
        this.hasRequested.set(true);
        this.feedbackTone.set('success');
        this.feedback.set(result.message || 'Zahtev za pristup moderatoru je uspesno poslat.');
      });
  }

  private requestStorageKey(userId: number): string {
    return `moderator-access-request:${userId}`;
  }

  protected iconPath(icon: string): string {
    switch (icon) {
      case 'plus':
        return 'M12 6.75v10.5M6.75 12h10.5';
      case 'pin':
        return 'M12 18.25s4.5-4.15 4.5-7.75a4.5 4.5 0 1 0-9 0c0 3.6 4.5 7.75 4.5 7.75Zm0-6a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z';
      case 'activity':
        return 'M5.5 12.5c1.2-1.3 2.3-1.3 3.5 0 1.2 1.3 2.3 1.3 3.5 0 1.2-1.3 2.3-1.3 3.5 0 1.2 1.3 2.3 1.3 3.5 0';
      case 'edit':
        return 'm7.25 16.75 6.8-6.8 2.5 2.5-6.8 6.8-3.25.45.75-2.95Zm7.45-8.95 1.05-1.05a1.77 1.77 0 1 1 2.5 2.5L17.2 10.3';
      case 'chart':
        return 'M6.5 17.5V9.75M12 17.5V6.5M17.5 17.5v-5.75M5 19h14';
      default:
        return '';
    }
  }
}
