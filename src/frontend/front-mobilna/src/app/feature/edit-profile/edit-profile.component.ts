import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { environment } from '../../../environment/environment';
import { AuthService, UpdateUserDto, UserDto } from '../../services/auth';
import { AppLanguage, TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface InterestOption {
  key: string;
  labelKey: string;
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
const DEFAULT_PHOTO_PATH = '/images/profiles/default_icon.png';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ImageCropperComponent],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent implements OnInit {
  @ViewChild('photoInput') private photoInput?: ElementRef<HTMLInputElement>;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  private readonly userSignal = signal<UserDto | null>(null);
  private get user(): UserDto | null { return this.userSignal(); }
  private set user(value: UserDto | null) { this.userSignal.set(value); }

  protected readonly name = signal('');
  protected readonly lastName = signal('');
  protected readonly country = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly appLanguageCode = signal<AppLanguage>('sr');
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

  /** File waiting to be cropped — drives the crop overlay */
  protected readonly pendingCropFile = signal<File | null>(null);

  /** Blob from the cropper, to be uploaded on confirm */
  private pendingCroppedBlob: Blob | null = null;

  /** Object URL for the cropped preview shown above the avatar */
  protected readonly cropPreviewUrl = signal<string | null>(null);

  protected readonly languageOptions = [
    { code: 'me', labelKey: 'language.montenegrin' },
    { code: 'sr', labelKey: 'language.serbian' },
    { code: 'en', labelKey: 'language.english' },
    { code: 'es', labelKey: 'language.spanish' },
    { code: 'it', labelKey: 'language.italian' },
    { code: 'el', labelKey: 'language.greek' },
  ];

  protected readonly imageUrl = computed(() => {
    const raw = this.userSignal()?.profileImageUrl?.trim() || DEFAULT_PHOTO_PATH;
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
  });

  /**
   * Returns true when the user currently has the default profile image,
   * meaning the "Remove photo" button should be hidden.
   */
  protected readonly isDefaultPhoto = computed(() => {
    const raw = this.userSignal()?.profileImageUrl?.trim() || DEFAULT_PHOTO_PATH;
    return raw === DEFAULT_PHOTO_PATH || raw === '';
  });

  protected readonly interests = signal<InterestOption[]>([
    { key: 'beaches', labelKey: 'editProfile.interest.beaches', selected: true },
    { key: 'hiking', labelKey: 'editProfile.interest.hiking', selected: false },
    { key: 'history', labelKey: 'editProfile.interest.history', selected: true },
    { key: 'gastronomy', labelKey: 'editProfile.interest.gastronomy', selected: false },
    { key: 'nightlife', labelKey: 'editProfile.interest.nightlife', selected: false },
    { key: 'culture', labelKey: 'editProfile.interest.culture', selected: true },
    { key: 'parks', labelKey: 'editProfile.interest.parks', selected: false },
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
          this.setFeedback(this.translationService.translate('editProfile.refreshFallback'), 'neutral');
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

  /* ── Photo / crop flow ─────────────────────────────────────────────── */

  protected changePhoto(): void {
    if (this.isSaving()) return;
    this.photoInput?.nativeElement.click();
  }

  /**
   * Called when the user picks a file.  Instead of uploading immediately,
   * we stash the File and show the crop overlay.
   */
  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !this.user?.id) return;

    this.clearFieldError('photo');

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.setFieldError('photo', this.translationService.translate('editProfile.photoFormats'));
      if (input) input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.setFieldError('photo', this.translationService.translate('editProfile.photoSize'));
      if (input) input.value = '';
      return;
    }

    // Show the cropper — reset any previous crop state first
    this.pendingCroppedBlob = null;
    this.pendingCropFile.set(file);
    if (input) input.value = '';
  }

  /** Called by the image-cropper on every crop change */
  protected onImageCropped(event: ImageCroppedEvent): void {
    this.pendingCroppedBlob = event.blob ?? null;

    // Show a local preview of the cropped circle
    if (event.blob) {
      const prevUrl = this.cropPreviewUrl();
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      this.cropPreviewUrl.set(URL.createObjectURL(event.blob));
    }
  }

  /** User clicked "Upload" in the crop overlay → upload the blob */
  protected confirmCrop(): void {
    if (!this.pendingCroppedBlob || !this.user?.id || this.isSaving()) return;

    const blob = this.pendingCroppedBlob;
    const file = new File([blob], 'avatar.png', { type: 'image/png' });

    // Hide the cropper
    this.pendingCropFile.set(null);
    this.pendingCroppedBlob = null;

    this.isSaving.set(true);
    this.authService
      .updateProfileImage(this.user.id, file)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'editProfile.photoSaveFailed'), 'error');
          // Revert preview on failure
          this.cropPreviewUrl.set(null);
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
        // Clear the local object-URL preview — the real URL is now in imageUrl()
        const prev = this.cropPreviewUrl();
        if (prev) URL.revokeObjectURL(prev);
        this.cropPreviewUrl.set(null);
        this.setFeedback(this.translationService.translate('editProfile.photoSaved'), 'success');
      });
  }

  /** User cancelled cropping — discard everything */
  protected cancelCrop(): void {
    this.pendingCropFile.set(null);
    this.pendingCroppedBlob = null;
    const prev = this.cropPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.cropPreviewUrl.set(null);
  }

  /**
   * Remove the custom photo.
   * Guard: only callable when the user has a custom photo (isDefaultPhoto() is false),
   * so this will never delete the default image.
   */
  protected removePhoto(): void {
    if (!this.user?.id || this.isSaving() || this.isDefaultPhoto()) return;

    this.isSaving.set(true);
    this.authService
      .removeProfileImage(this.user.id)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'editProfile.photoRemoveFailed'), 'error');
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
        this.setFeedback(this.translationService.translate('editProfile.photoRemoved'), 'success');
      });
  }

  /* ── Save / cancel ─────────────────────────────────────────────────── */

  protected saveChanges(): void {
    if (!this.user?.id || this.isSaving()) return;
    if (!this.validateForm()) return;

    const dto: UpdateUserDto = {
      firstName: this.name().trim(),
      lastName: this.lastName().trim(),
      country: this.country().trim() || null,
      phoneNumber: this.phone().trim() || null,
      language: this.appLanguageCode(),
    };

    this.isSaving.set(true);
    this.authService
      .update(this.user.id, dto)
      .pipe(
        catchError((error) => {
          this.setFeedback(this.readErrorMessage(error, 'editProfile.saveFailed'), 'error');
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
        this.setFeedback(this.translationService.translate('editProfile.saved'), 'success');
      });
      this.router.navigate(['/profile']);
  }

  protected cancelChanges(): void {
    this.router.navigate(['/profile']);
  }

  /* ── Language ──────────────────────────────────────────────────────── */

  protected toggleLanguageMenu(): void {
    this.isLanguageMenuOpen.update((current) => !current);
  }

  protected selectLanguageOption(code: string): void {
    const normalizedCode = this.normalizeLanguage(code);
    this.appLanguageCode.set(normalizedCode);
    this.isLanguageMenuOpen.set(false);
    this.setFeedback(
      this.translationService.translate('editProfile.languageSelected', {
        language: this.languageLabel(normalizedCode),
      }),
      'neutral',
    );
  }

  /* ── Interests ─────────────────────────────────────────────────────── */

  protected toggleInterest(key: string): void {
    this.interests.update((items) =>
      items.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item)),
    );
    this.persistInterests();
  }

  protected languageLabel(code = this.appLanguageCode()): string {
    return this.translationService.translate(this.translationService.labelKeyForLanguage(code));
  }

  /* ── Private helpers ───────────────────────────────────────────────── */

  private patchFromUser(user: UserDto): void {
    this.name.set(user.firstName ?? '');
    this.lastName.set(user.lastName ?? '');
    this.country.set(user.country ?? '');
    this.email.set(user.email ?? '');
    this.phone.set(user.phoneNumber ?? '');
    this.appLanguageCode.set(this.normalizeLanguage(user.language));
  }

  private normalizeLanguage(language?: string | null): AppLanguage {
    return this.translationService.normalizeLanguageCode(language);
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
      nextErrors.name = this.translationService.translate('editProfile.nameError');
    }

    if (this.lastName().trim().length < 2) {
      nextErrors.lastName = this.translationService.translate('editProfile.lastNameError');
    }

    if (this.country().trim().length > 40) {
      nextErrors.country = this.translationService.translate('editProfile.countryError');
    }

    const phone = this.phone().trim();
    if (phone && !/^\+?[0-9][0-9\s/-]{5,19}$/.test(phone)) {
      nextErrors.phone = this.translationService.translate('editProfile.phoneError');
    }

    this.fieldErrors.set(nextErrors);

    const hasError = Object.values(nextErrors).some((value) => !!value);

    if (hasError) {
      this.setFeedback(this.translationService.translate('editProfile.validationError'), 'error');
    }

    return !hasError;
  }

  private setFieldError(field: keyof ProfileFieldErrors, message: string): void {
    this.fieldErrors.update((current) => ({ ...current, [field]: message }));
  }

  private clearFieldError(field: keyof ProfileFieldErrors): void {
    this.fieldErrors.update((current) => ({ ...current, [field]: '' }));
  }

  private readErrorMessage(error: unknown, fallbackKey: string): string {
    const candidate = error as { error?: { message?: string } };
    return candidate?.error?.message || this.translationService.translate(fallbackKey);
  }

  private loadInterests(): void {
    const raw = localStorage.getItem(INTERESTS_STORAGE_KEY);
    if (!raw) return;

    try {
      const selectedValues = JSON.parse(raw) as string[];

      if (!Array.isArray(selectedValues)) return;

      const legacyMap: Record<string, string> = {
        Plaze: 'beaches',
        Planinarenje: 'hiking',
        Istorija: 'history',
        Gastronomija: 'gastronomy',
        'Nocni zivot': 'nightlife',
        Kultura: 'culture',
        'Nacionalni parkovi': 'parks',
      };

      const selectedKeys = selectedValues.map((value) => legacyMap[value] ?? value);

      this.interests.update((items) =>
        items.map((item) => ({
          ...item,
          selected: selectedKeys.includes(item.key),
        })),
      );
    } catch {
      localStorage.removeItem(INTERESTS_STORAGE_KEY);
    }
  }

  private persistInterests(): void {
    const selectedKeys = this.interests()
      .filter((item) => item.selected)
      .map((item) => item.key);

    localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(selectedKeys));
  }
}