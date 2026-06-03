import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { environment } from '../../../../environment/environment';
import { AuthService, UpdateUserDto, ChangePasswordDto } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';
import { TranslationService } from '../../../services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { timeout } from 'rxjs';
type PermissionItem = {
  labelKey: string;
  detailKey: string;
  icon: string;
};

type ModalState = 'closed' | 'opening' | 'open' | 'closing';

type ProfileLanguageOption = {
  code: string;
  labelKey: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIcon, ImageCropperComponent, TranslatePipe],
  templateUrl: '../../admin/profile/profile.component.html',
  styleUrls: ['../../admin/profile/profile.component.css'],
})
export class ProfileComponentContentCreator implements OnInit, OnDestroy {
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    `${environment.apiUrl.replace('/api', '')}/images/profiles/default_icon.png`;

  readonly permissionItems: PermissionItem[] = [
    { labelKey: 'Create objects, events, and activities', detailKey: 'Content Creator can create new objects, events, and activities, and they start in Pending state.', icon: 'add_circle' },
    { labelKey: 'Edit own published content', detailKey: 'Content Creator can update only their own objects, events, and activities.', icon: 'edit' },
    { labelKey: 'Delete own unpublished content', detailKey: 'Content Creator can delete only their own content before it is Approved.', icon: 'delete' },
    { labelKey: 'Manage content images', detailKey: 'Content Creator can add images to their own objects, events, and activities.', icon: 'image' },
    { labelKey: 'Respond to reviews', detailKey: 'Content Creator can reply to reviews on their own objects and edit or delete that reply.', icon: 'rate_review' },
    { labelKey: 'Request deletions', detailKey: 'Content Creator can request deletion of their own Approved objects, events, and activities.', icon: 'request_page' },
    { labelKey: 'View own deletion requests', detailKey: 'Content Creator can list and inspect only their own deletion requests.', icon: 'list_alt' },
    { labelKey: 'View dashboard overview', detailKey: 'Content Creator can open the content creator dashboard overview.', icon: 'dashboard' },
  ];

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('languageDropdown') languageDropdown?: ElementRef<HTMLElement>;
  @ViewChild('countryDropdown') countryDropdown?: ElementRef<HTMLElement>;

  readonly languageOptions: ProfileLanguageOption[] = [
    { code: 'sr', labelKey: 'language.serbian' },
    { code: 'en', labelKey: 'language.english' },
    { code: 'es', labelKey: 'language.spanish' },
    { code: 'it', labelKey: 'language.italian' },
  ];

  readonly countryOptions: string[] = [
    'Albania', 'Argentina', 'Australia', 'Austria', 'Belgium',
    'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Canada', 'China',
    'Croatia', 'Czech Republic', 'Denmark', 'Finland', 'France',
    'Germany', 'Greece', 'Hungary', 'India', 'Italy',
    'Japan', 'Kosovo', 'Mexico', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
    'Russia', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
    'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',
    'United States',
  ];

  user: UserDto = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    country: '',
    language: '',
  };

  initials = '';
  role = '';
  avatarUrl: string | null = null;
  pendingCropFile: File | null = null;
  isSaving = false;
  saveSuccess = false;
  permissionsModalState: ModalState = 'closed';
  passwordModalState: ModalState = 'closed';
  passwordChangeMode: 'direct' | 'forgot-otp' | 'forgot-password' = 'direct';
  passwordError = '';
  passwordSuccess = false;
  passwordLoading = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmNewPassword = true;
  otpCode = '';
  otpSecondsRemaining = 0;
  otpResendSecondsRemaining = 0;
  languageMenuOpen = false;
  countryMenuOpen = false;

  private cropPreviewUrl: string | null = null;
  private pendingCroppedBlob: Blob | null = null;
  private permissionsModalCloseTimerId: number | null = null;
  private passwordModalCloseTimerId: number | null = null;
  private otpExpiryTimerId: number | null = null;
  private otpResendTimerId: number | null = null;
  private forgotResetSessionToken = '';

  private static readonly OTP_EXPIRY_SECONDS = 300;
  private static readonly OTP_RESEND_SECONDS = 30;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
  ) { }

  ngOnInit(): void {
    const userData = this.authService.getUser();

    if (!userData?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.syncUserState(userData);

    this.authService.getById(userData.id).subscribe({
      next: (fullUser) => {
        this.syncUserState(fullUser);
      },
      error: (err) => {
        console.error('Failed to refresh profile data', err);
      },
    });
  }

  ngOnDestroy(): void {
    this.revokeCropPreviewUrl();
    this.clearPermissionsModalTimer();
    this.clearOtpTimers();
    this.unlockBodyScroll();
  }

  get cropPreview(): string | null {
    return this.cropPreviewUrl;
  }

  get displayName(): string {
    return `${this.user.firstName} ${this.user.lastName}`.trim() || this.translationService.translate('adminProfile.unknownUser');
  }

  get permissionCount(): number {
    return this.permissionItems.length;
  }

  get roleLabelKey(): string {
    switch (this.role) {
      case 'admin':
        return 'adminProfile.roles.admin';
      case 'manager':
        return 'adminProfile.roles.manager';
      case 'content-creator':
        return 'adminProfile.roles.contentCreator';
      default:
        return 'adminProfile.roles.user';
    }
  }

  get roleBadgeClass(): string {
    switch (this.role) {
      case 'admin':
        return 'badge-red';
      case 'manager':
        return 'badge-purple';
      case 'content-creator':
        return 'badge-amber';
      default:
        return 'badge-blue';
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      if (input) input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (input) input.value = '';
      return;
    }

    this.pendingCroppedBlob = null;
    this.revokeCropPreviewUrl();
    this.pendingCropFile = file;
    input.value = '';
  }

  onImageCropped(event: ImageCroppedEvent): void {
    this.pendingCroppedBlob = event.blob ?? null;

    if (event.blob) {
      this.revokeCropPreviewUrl();
      this.cropPreviewUrl = URL.createObjectURL(event.blob);
    }
  }

  confirmCrop(): void {
    if (!this.user.id || !this.pendingCroppedBlob) return;

    const file = new File([this.pendingCroppedBlob], 'profile-avatar.png', { type: 'image/png' });
    const previousAvatarUrl = this.avatarUrl;

    if (this.cropPreviewUrl) {
      this.avatarUrl = this.cropPreviewUrl;
    }

    this.pendingCropFile = null;
    this.pendingCroppedBlob = null;

    this.authService.updateProfileImage(this.user.id, file).subscribe({
      next: (updated) => {
        const mergedUser = this.mergeUserState(updated);
        this.authService.setCurrentUser(mergedUser);
        this.syncUserState(mergedUser);
        this.clearCropState(true);
        this.showSaveSuccess();
        window.dispatchEvent(new Event('storage'));
      },
      error: (err) => {
        console.error('Avatar upload failed', err);
        this.avatarUrl = previousAvatarUrl;
      },
    });
  }

  cancelCrop(): void {
    this.clearCropState(true);
  }

  removePhoto(): void {
    if (!this.user.id) {
      this.clearCropState(true);
      this.avatarUrl = ProfileComponentContentCreator.DEFAULT_PROFILE_IMAGE_URL;
      return;
    }

    this.authService.removeProfileImage(this.user.id).subscribe({
      next: (updated) => {
        const mergedUser = this.mergeUserState({
          ...updated,
          profileImageUrl:
            updated.profileImageUrl?.trim() || ProfileComponentContentCreator.DEFAULT_PROFILE_IMAGE_URL,
        });
        this.authService.setCurrentUser(mergedUser);
        this.syncUserState(mergedUser);
        this.cdr.detectChanges();
        this.clearCropState(true);
        this.showSaveSuccess();
        window.dispatchEvent(new Event('storage'));
      },
      error: (err) => {
        console.error('Remove photo failed', err);
        this.clearCropState(true);
        this.avatarUrl = ProfileComponentContentCreator.DEFAULT_PROFILE_IMAGE_URL;
      },
    });
  }

  saveChanges(): void {
    if (!this.user.id || this.isSaving) return;

    const dto: UpdateUserDto = {
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      dateOfBirth: this.user.dateOfBirth || null,
      phoneNumber: this.user.phoneNumber,
      country: this.user.country,
      language: this.user.language,
    };

    this.isSaving = true;
    this.cdr.detectChanges();
    this.authService.update(this.user.id, dto).subscribe({
      next: (updated) => {
        const mergedUser = this.mergeUserState(updated);
        this.syncUserState(mergedUser);
        this.authService.setCurrentUser(mergedUser);
        this.translationService.setLanguage(mergedUser.language);
        this.showSaveSuccess();
        window.dispatchEvent(new Event('storage'));
      },
      error: (err) => {
        console.error('Save failed', err);
      },
    }).add(() => {
      this.isSaving = false;
      this.cdr.detectChanges();
    });

  }

  resetPassword(): void {
    if (this.passwordModalState !== 'closed') return;

    this.passwordModalState = 'opening';
    this.passwordChangeMode = 'direct';
    this.passwordError = '';
    this.passwordSuccess = false;
    this.passwordLoading = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.hideCurrentPassword = true;
    this.hideNewPassword = true;
    this.hideConfirmNewPassword = true;
    this.otpCode = '';
    this.otpSecondsRemaining = 0;
    this.otpResendSecondsRemaining = 0;
    this.forgotResetSessionToken = '';
    this.clearOtpTimers();
    this.lockBodyScroll();

    window.setTimeout(() => {
      if (this.passwordModalState === 'opening') {
        this.passwordModalState = 'open';
      }
    }, 20);
  }

  openPermissionsModal(): void {
    if (this.permissionsModalState !== 'closed') return;

    this.permissionsModalState = 'opening';
    this.lockBodyScroll();

    window.setTimeout(() => {
      if (this.permissionsModalState === 'opening') {
        this.permissionsModalState = 'open';
      }
    }, 20);
  }

  closePermissionsModal(): void {
    if (this.permissionsModalState === 'closed') return;

    this.permissionsModalState = 'closing';

    if (this.permissionsModalCloseTimerId) {
      window.clearTimeout(this.permissionsModalCloseTimerId);
    }

    this.permissionsModalCloseTimerId = window.setTimeout(() => {
      this.permissionsModalState = 'closed';
      this.releaseBodyScrollIfNoModal();
      this.permissionsModalCloseTimerId = null;
    }, 220);
  }

  closePasswordModal(forceClose = false): void {
    if (this.passwordModalState === 'closed' || (this.passwordLoading && !forceClose)) {
      return;
    }

    this.passwordModalState = 'closing';
    this.passwordError = '';
    this.clearOtpTimers();

    if (this.passwordModalCloseTimerId) {
      window.clearTimeout(this.passwordModalCloseTimerId);
    }

    this.passwordModalCloseTimerId = window.setTimeout(() => {
      this.passwordModalState = 'closed';
      this.passwordChangeMode = 'direct';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.otpCode = '';
      this.otpSecondsRemaining = 0;
      this.otpResendSecondsRemaining = 0;
      this.forgotResetSessionToken = '';
      this.passwordSuccess = false;
      this.releaseBodyScrollIfNoModal();
      this.passwordModalCloseTimerId = null;
    }, 220);
  }

  get selectedLanguageLabel(): string {
    return this.translationService.translate(this.translationService.labelKeyForLanguage(this.user.language));
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.languageMenuOpen = !this.languageMenuOpen;
  }

  selectLanguage(code: string, event: Event): void {
    event.stopPropagation();
    this.user.language = code;
    this.languageMenuOpen = false;
  }

  get selectedCountryLabel(): string {
    return this.user.country?.trim() || '';
  }

  toggleCountryMenu(event: Event): void {
    event.stopPropagation();
    this.countryMenuOpen = !this.countryMenuOpen;
  }

  selectCountry(country: string, event: Event): void {
    event.stopPropagation();
    this.user.country = country;
    this.countryMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;

    if (this.languageMenuOpen && !this.languageDropdown?.nativeElement.contains(target)) {
      this.languageMenuOpen = false;
    }

    if (this.countryMenuOpen && !this.countryDropdown?.nativeElement.contains(target)) {
      this.countryMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.languageMenuOpen) {
      this.languageMenuOpen = false;
      return;
    }

    if (this.countryMenuOpen) {
      this.countryMenuOpen = false;
      return;
    }

    if (this.passwordModalState !== 'closed') {
      this.closePasswordModal();
    } else if (this.permissionsModalState !== 'closed') {
      this.closePermissionsModal();
    }
  }

  submitPasswordStep(): void {
    if (this.passwordLoading) return;

    this.passwordError = '';

    if (!this.currentPassword) {
      this.passwordError = 'Enter your current password.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'New password must be at least 8 characters long.';
      return;
    }

    if (!/[A-Z]/.test(this.newPassword) || !/[\d\W]/.test(this.newPassword)) {
      this.passwordError = 'New password must include one uppercase letter and one number or symbol.';
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }

    if (!this.user.id) {
      this.passwordError = 'User ID is not available.';
      return;
    }

    this.passwordLoading = true;

    const dto: ChangePasswordDto = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmNewPassword,
    };

    this.authService.changePassword(this.user.id, dto).subscribe({
      next: () => {
        this.passwordLoading = false;
        this.passwordSuccess = true;
        this.cdr.detectChanges();
        window.setTimeout(() => this.closePasswordModal(true), 1800);
      },
      error: (err) => {
        this.passwordLoading = false;
        this.passwordError = err?.error?.message ?? 'Password change failed. Check your current password.';
        this.cdr.detectChanges();
      },
    });
  }

  startForgotFlow(): void {
    if (this.passwordLoading) return;

    if (!this.user.email) {
      this.passwordError = 'Email address is not available for this account.';
      return;
    }

    this.passwordLoading = true;
    this.passwordError = '';
    this.cdr.detectChanges();

    this.authService.forgotPassword(this.user.email).pipe(timeout(15000)).subscribe({
      next: () => {
        this.passwordLoading = false;
        this.passwordChangeMode = 'forgot-otp';
        this.otpCode = '';
        this.startOtpCountdown();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.passwordLoading = false;
        this.passwordError = err?.name === 'TimeoutError'
          ? 'Request timed out. Check your connection and try again.'
          : (err?.error?.message ?? 'Unable to send a verification code right now.');
        this.cdr.detectChanges();
      },
    });
  }

  submitForgotOtp(): void {
    if (this.passwordLoading) return;

    this.passwordError = '';

    if (!/^\d{6}$/.test(this.otpCode.trim())) {
      this.passwordError = 'Enter the 6-digit verification code.';
      return;
    }

    this.passwordLoading = true;

    this.authService.verifyResetCode({ email: this.user.email, code: this.otpCode.trim() }).subscribe({
      next: (response: { resetSessionToken?: string; ResetSessionToken?: string; token?: string } | string) => {
        this.forgotResetSessionToken = this.extractResetSessionToken(response);

        if (!this.forgotResetSessionToken) {
          this.passwordLoading = false;
          this.passwordError = 'Verification failed. Please request a new code.';
          this.cdr.detectChanges();
          return;
        }

        this.passwordLoading = false;
        this.passwordChangeMode = 'forgot-password';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.clearOtpTimers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.passwordLoading = false;
        this.passwordError = err?.error?.message ?? 'Invalid or expired verification code.';
        this.cdr.detectChanges();
      },
    });
  }

  submitForgotPassword(): void {
    if (this.passwordLoading) return;

    this.passwordError = '';

    if (this.newPassword.length < 8) {
      this.passwordError = 'New password must be at least 8 characters long.';
      return;
    }

    if (!/[A-Z]/.test(this.newPassword) || !/[\d\W]/.test(this.newPassword)) {
      this.passwordError = 'New password must include one uppercase letter and one number or symbol.';
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }

    this.passwordLoading = true;

    this.authService.resetPassword(
      this.user.email!,
      this.otpCode.trim(),
      this.newPassword,
      this.confirmNewPassword,
      this.forgotResetSessionToken,
    ).subscribe({
      next: () => {
        this.passwordLoading = false;
        this.passwordSuccess = true;
        this.cdr.detectChanges();
        window.setTimeout(() => this.closePasswordModal(true), 1800);
      },
      error: (err) => {
        this.passwordLoading = false;
        this.passwordError = err?.error?.message ?? 'Password change failed.';
        this.cdr.detectChanges();
      },
    });
  }

  resendForgotCode(): void {
    if (this.passwordLoading || this.otpResendSecondsRemaining > 0) return;
    this.startForgotFlow();
  }

  backToDirectMode(): void {
    if (this.passwordLoading) return;

    this.passwordChangeMode = 'direct';
    this.passwordError = '';
    this.otpCode = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.forgotResetSessionToken = '';
    this.clearOtpTimers();
  }

  cancel(): void {
    this.router.navigate([this.authService.getDashboardRouteFromStoredUser()]);
  }

  private buildInitials(user: UserDto): string {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  }

  private static normalizeCountry(raw: string | null | undefined): string {
    if (!raw) return '';
    const map: Record<string, string> = {
      'srbija': 'Serbia', 'crna gora': 'Montenegro', 'hrvatska': 'Croatia',
      'bosna i hercegovina': 'Bosnia and Herzegovina', 'slovenija': 'Slovenia',
      'severna makedonija': 'North Macedonia', 'makedonija': 'North Macedonia',
      'albanija': 'Albania', 'bugarska': 'Bulgaria', 'rumunija': 'Romania',
      'mađarska': 'Hungary', 'madžarska': 'Hungary', 'češka': 'Czech Republic',
      'slovačka': 'Slovakia', 'poljska': 'Poland', 'nemačka': 'Germany',
      'austrija': 'Austria', 'švajcarska': 'Switzerland', 'italija': 'Italy',
      'španija': 'Spain', 'francuska': 'France', 'belgija': 'Belgium',
      'holandija': 'Netherlands', 'norveška': 'Norway', 'danska': 'Denmark',
      'finska': 'Finland', 'turska': 'Turkey', 'rusija': 'Russia',
      'kina': 'China', 'indija': 'India', 'australija': 'Australia',
      'kanada': 'Canada', 'sjedinjene američke države': 'United States',
      'sad': 'United States', 'velika britanija': 'United Kingdom',
      'grčka': 'Greece', 'švedska': 'Sweden', 'meksiko': 'Mexico',
      'brazil': 'Brazil', 'argentina': 'Argentina', 'ukrajina': 'Ukraine',
      'kosovo': 'Kosovo',
    };
    return map[raw.trim().toLowerCase()] ?? raw.trim();
  }

  private syncUserState(user: UserDto): void {
    this.user = {
      ...user,
      language: user.language?.trim() || 'en',
      country: ProfileComponentContentCreator.normalizeCountry(user.country),
      dateOfBirth: this.normalizeDateForInput(user.dateOfBirth),
    };
    this.initials = this.buildInitials(user);
    this.role = this.authService.getNormalizedRole(user) ?? '';
    this.avatarUrl = user.profileImageUrl?.trim() || ProfileComponentContentCreator.DEFAULT_PROFILE_IMAGE_URL;
  }

  private mergeUserState(updated: UserDto): UserDto {
    return {
      ...this.user,
      ...updated,
      profileImageUrl:
        updated.profileImageUrl?.trim() ||
        this.user.profileImageUrl ||
        ProfileComponentContentCreator.DEFAULT_PROFILE_IMAGE_URL,
    };
  }

  private normalizeDateForInput(value?: string): string {
    if (!value) return '';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value.slice(0, 10);
    }

    return parsed.toISOString().slice(0, 10);
  }

  private clearCropState(resetInput = false): void {
    this.pendingCropFile = null;
    this.pendingCroppedBlob = null;
    this.revokeCropPreviewUrl();

    if (resetInput && this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private revokeCropPreviewUrl(): void {
    if (this.cropPreviewUrl) {
      URL.revokeObjectURL(this.cropPreviewUrl);
      this.cropPreviewUrl = null;
    }
  }

  private showSaveSuccess(): void {
    this.saveSuccess = true;
    setTimeout(() => {
      this.saveSuccess = false;
    }, 2500);
  }

  private startOtpCountdown(): void {
    this.clearOtpTimers();
    this.otpSecondsRemaining = ProfileComponentContentCreator.OTP_EXPIRY_SECONDS;
    this.otpResendSecondsRemaining = ProfileComponentContentCreator.OTP_RESEND_SECONDS;

    this.otpExpiryTimerId = window.setInterval(() => {
      this.otpSecondsRemaining = Math.max(0, this.otpSecondsRemaining - 1);
      if (this.otpSecondsRemaining === 0) {
        this.passwordError = 'The verification code has expired. Resend it to continue.';
        window.clearInterval(this.otpExpiryTimerId!);
        this.otpExpiryTimerId = null;
      }
      this.cdr.detectChanges();
    }, 1000);

    this.otpResendTimerId = window.setInterval(() => {
      this.otpResendSecondsRemaining = Math.max(0, this.otpResendSecondsRemaining - 1);
      if (this.otpResendSecondsRemaining === 0) {
        window.clearInterval(this.otpResendTimerId!);
        this.otpResendTimerId = null;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private clearOtpTimers(): void {
    if (this.otpExpiryTimerId !== null) {
      window.clearInterval(this.otpExpiryTimerId);
      this.otpExpiryTimerId = null;
    }
    if (this.otpResendTimerId !== null) {
      window.clearInterval(this.otpResendTimerId);
      this.otpResendTimerId = null;
    }
  }

  private extractResetSessionToken(
    response: { resetSessionToken?: string; ResetSessionToken?: string; token?: string } | string | null | undefined,
  ): string {
    if (!response) return '';
    if (typeof response === 'string') return response;
    return response.resetSessionToken ?? response.ResetSessionToken ?? response.token ?? '';
  }

  private clearPermissionsModalTimer(): void {
    if (this.permissionsModalCloseTimerId !== null) {
      window.clearTimeout(this.permissionsModalCloseTimerId);
      this.permissionsModalCloseTimerId = null;
    }
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }

  private releaseBodyScrollIfNoModal(): void {
    if (this.passwordModalState === 'closed' && this.permissionsModalState === 'closed') {
      this.unlockBodyScroll();
    }
  }

}
