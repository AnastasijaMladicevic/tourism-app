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

interface ProfileFieldErrors {
  name: string;
  lastName: string;
  country: string;
  phone: string;
  photo: string;
}

const INTERESTS_STORAGE_KEY = 'spirego-mobile-profile-interests';

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
  protected readonly isLanguageMenuOpen = signal(false);
  protected readonly feedbackMessage = signal('');
  protected readonly feedbackTone = signal<'success' | 'error' | 'neutral'>('neutral');
  protected readonly fieldErrors = signal<ProfileFieldErrors>({
    name: '',
    lastName: '',
    country: '',
    phone: '',
    photo: '',
  });
  protected readonly languageOptions = [
    { code: 'sr', label: 'Crnogorski / Srpski' },
    { code: 'en', label: 'English' },
  ];

  protected readonly imageUrl = computed(() => {
    const raw = this.user?.profileImageUrl?.trim() || '/images/profiles/default_icon.png';
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
  });

  protected readonly interests = signal<InterestOption[]>([
    { label: 'Plaze', selected: true },
    { label: 'Planinarenje', selected: false },
    { label: 'Istorija', selected: true },
    { label: 'Gastronomija', selected: false },
    { label: 'Nocni zivot', selected: false },
    { label: 'Kultura', selected: true },
    { label: 'Nacionalni parkovi', selected: false },
  ]);

  protected readonly selectedInterestCount = computed(
    () => this.interests().filter((item) => item.selected).length,
  );

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/profile']);
      return;
    }

    this.user = currentUser;
    this.patchFromUser(currentUser);
    this.loadInterests();

    this.authService
      .getById(currentUser.id)
      .pipe(
        catchError(() => {
          this.setFeedback('Profil nije osvezen sa servera. Prikazani su lokalni podaci.', 'neutral');
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

  protected updateName(value: string): void {
    this.name.set(value);
    this.clearFieldError('name');
  }

  protected updateLastName(value: string): void {
    this.lastName.set(value);
    this.clearFieldError('lastName');
  }

  protected updateCountry(value: string): void {
    this.country.set(value);
    this.clearFieldError('country');
  }

  protected updatePhone(value: string): void {
    this.phone.set(value);
    this.clearFieldError('phone');
  }

  protected saveChanges(): void {
    if (!this.user?.id || this.isSaving()) return;
    if (!this.validateForm()) return;

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
          this.setFeedback(this.readErrorMessage(error, 'Promene nisu sacuvane.'), 'error');
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
        this.persistInterests();
        this.setFeedback('Promene su uspesno sacuvane.', 'success');
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

    this.clearFieldError('photo');

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.setFieldError('photo', 'Dozvoljeni formati su PNG, JPG i WEBP.');
      if (input) input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.setFieldError('photo', 'Fotografija ne sme biti veca od 5MB.');
      if (input) input.value = '';
      return;
    }

    this.isSaving.set(true);
    this.authService
      .updateProfileImage(this.user.id, file)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'Fotografija nije sacuvana.'), 'error');
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
        this.setFeedback('Fotografija je uspesno azurirana.', 'success');
      });
  }

  protected toggleLanguageMenu(): void {
    this.isLanguageMenuOpen.update((current) => !current);
  }

  protected selectLanguageOption(code: string): void {
    this.appLanguage.set(this.mapLanguage(code));
    this.isLanguageMenuOpen.set(false);
    this.setFeedback(`Izabran je jezik: ${this.mapLanguage(code)}.`, 'neutral');
  }

  protected toggleInterest(label: string): void {
    this.interests.update((items) =>
      items.map((item) =>
        item.label === label ? { ...item, selected: !item.selected } : item,
      ),
    );
    this.persistInterests();
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

  private validateForm(): boolean {
    const nextErrors: ProfileFieldErrors = {
      name: '',
      lastName: '',
      country: '',
      phone: '',
      photo: '',
    };

    if (this.name().trim().length < 2) {
      nextErrors.name = 'Ime mora imati najmanje 2 karaktera.';
    }

    if (this.lastName().trim().length < 2) {
      nextErrors.lastName = 'Prezime mora imati najmanje 2 karaktera.';
    }

    if (this.country().trim().length > 40) {
      nextErrors.country = 'Drzava moze imati najvise 40 karaktera.';
    }

    const phone = this.phone().trim();
    if (phone && !/^\+?[0-9][0-9\s/-]{5,19}$/.test(phone)) {
      nextErrors.phone = 'Telefon unesi u formatu +382 67 000 000 ili slicno.';
    }

    this.fieldErrors.set(nextErrors);

    const hasError = Object.values(nextErrors).some((value) => !!value);

    if (hasError) {
      this.setFeedback('Proveri oznacena polja pre cuvanja.', 'error');
    }

    return !hasError;
  }

  private setFieldError(field: keyof ProfileFieldErrors, message: string): void {
    this.fieldErrors.update((current) => ({ ...current, [field]: message }));
  }

  private clearFieldError(field: keyof ProfileFieldErrors): void {
    this.fieldErrors.update((current) => ({ ...current, [field]: '' }));
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string } };
    return candidate?.error?.message || fallback;
  }

  private loadInterests(): void {
    const raw = localStorage.getItem(INTERESTS_STORAGE_KEY);
    if (!raw) return;

    try {
      const selectedLabels = JSON.parse(raw) as string[];

      if (!Array.isArray(selectedLabels)) return;

      this.interests.update((items) =>
        items.map((item) => ({
          ...item,
          selected: selectedLabels.includes(item.label),
        })),
      );
    } catch {
      localStorage.removeItem(INTERESTS_STORAGE_KEY);
    }
  }

  private persistInterests(): void {
    const selectedLabels = this.interests()
      .filter((item) => item.selected)
      .map((item) => item.label);

    localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(selectedLabels));
  }
}
