import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService, UpdateUserDto, UserDto } from '../../services/auth';

interface InterestOption {
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent implements OnInit {
  @ViewChild('photoInput') private photoInput?: ElementRef<HTMLInputElement>;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private user: UserDto | null = null;

  protected readonly name = signal('');
  protected readonly lastName = signal('');
  protected readonly country = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly appLanguage = signal('Crnogorski');
  protected readonly isSaving = signal(false);
  protected readonly feedbackMessage = signal('');
  protected readonly feedbackTone = signal<'success' | 'error' | 'neutral'>('neutral');

  protected readonly imageUrl = computed(() => {
    const raw = this.user?.profileImageUrl?.trim() || '/images/profiles/default_icon.png';
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
  });

  protected readonly interests = signal<InterestOption[]>([
    { label: 'Plaže', selected: true },
    { label: 'Planinarenje', selected: false },
    { label: 'Istorija', selected: true },
    { label: 'Gastronomija', selected: false },
    { label: 'Noćni život', selected: false },
    { label: 'Kultura', selected: true },
    { label: 'Nacionalni parkovi', selected: false },
  ]);

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/profile']);
      return;
    }

    this.user = currentUser;
    this.patchFromUser(currentUser);

    this.authService
      .getById(currentUser.id)
      .pipe(
        catchError(() => {
          this.setFeedback('Profil nije osvežen sa servera. Prikazani su lokalni podaci.', 'neutral');
          return of(null);
        }),
      )
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        this.patchFromUser(user);
      });
  }

  protected goBack(): void {
    this.router.navigate(['/profile']);
  }

  protected saveChanges(): void {
    if (!this.user?.id || this.isSaving()) return;

    const dto: UpdateUserDto = {
      firstName: this.name().trim(),
      lastName: this.lastName().trim(),
      country: this.country().trim() || null,
      phoneNumber: this.phone().trim() || null,
      language: this.toLanguageCode(this.appLanguage()),
    };

    this.isSaving.set(true);
    this.authService
      .update(this.user.id, dto)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'Promene nisu sačuvane.'), 'error');
          return of(null);
        }),
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        this.patchFromUser(user);
        this.setFeedback('Promene su uspešno sačuvane.', 'success');
      });
  }

  protected cancelChanges(): void {
    this.router.navigate(['/profile']);
  }

  protected removePhoto(): void {
    if (!this.user?.id || this.isSaving()) return;

    this.isSaving.set(true);
    this.authService
      .removeProfileImage(this.user.id)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'Fotografija nije uklonjena.'), 'error');
          return of(null);
        }),
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        this.patchFromUser(user);
        this.setFeedback('Fotografija je uklonjena.', 'success');
      });
  }

  protected changePhoto(): void {
    if (this.isSaving()) return;
    this.photoInput?.nativeElement.click();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !this.user?.id) return;

    this.isSaving.set(true);
    this.authService
      .updateProfileImage(this.user.id, file)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'Fotografija nije sačuvana.'), 'error');
          return of(null);
        }),
        finalize(() => {
          this.isSaving.set(false);
          if (input) input.value = '';
        }),
      )
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        this.patchFromUser(user);
        this.setFeedback('Fotografija je uspešno ažurirana.', 'success');
      });
  }

  protected openLanguagePicker(): void {
    const current = this.toLanguageCode(this.appLanguage());
    const answer = window.prompt('Izaberi jezik: sr ili en', current);
    if (answer === null) return;

    const normalized = answer.trim().toLowerCase();
    if (!['sr', 'en'].includes(normalized)) {
      this.setFeedback('Dozvoljene vrednosti su sr ili en.', 'error');
      return;
    }

    this.appLanguage.set(this.mapLanguage(normalized));
    this.setFeedback(`Izabran je jezik: ${this.mapLanguage(normalized)}.`, 'neutral');
  }

  protected toggleInterest(label: string): void {
    this.interests.update((items) =>
      items.map((item) =>
        item.label === label ? { ...item, selected: !item.selected } : item,
      ),
    );
  }

  private patchFromUser(user: UserDto): void {
    this.name.set(user.firstName ?? '');
    this.lastName.set(user.lastName ?? '');
    this.country.set(user.country ?? '');
    this.email.set(user.email ?? '');
    this.phone.set(user.phoneNumber ?? '');
    this.appLanguage.set(this.mapLanguage(user.language));
  }

  private mapLanguage(language?: string | null): string {
    return language?.toLowerCase() === 'en' ? 'Engleski' : 'Crnogorski';
  }

  private toLanguageCode(label?: string | null): string {
    return label?.toLowerCase() === 'engleski' ? 'en' : 'sr';
  }

  private setFeedback(message: string, tone: 'success' | 'error' | 'neutral'): void {
    this.feedbackMessage.set(message);
    this.feedbackTone.set(tone);
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string } };
    return candidate?.error?.message || fallback;
  }
}
