import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { environment } from '../../../../environment/environment';
import { AuthService, UpdateUserDto } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';
import { TranslationService } from '../../../services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
type PermissionItem = {
  labelKey: string;
  detailKey: string;
  icon: string;
};

type PasswordChangeStep = 'credentials' | 'otp';

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
export class ProfileComponentManager implements OnInit, OnDestroy {
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    `${environment.apiUrl.replace('/api', '')}/images/profiles/default_icon.png`;

  readonly permissionItems: PermissionItem[] = [
    { labelKey: 'managerProfile.permissions.viewDashboardLabel', detailKey: 'managerProfile.permissions.viewDashboardDetail', icon: 'dashboard' },
    { labelKey: 'managerProfile.permissions.manageEventsLabel', detailKey: 'managerProfile.permissions.manageEventsDetail', icon: 'event' },
    { labelKey: 'managerProfile.permissions.manageActivitiesLabel', detailKey: 'managerProfile.permissions.manageActivitiesDetail', icon: 'local_activity' },
    { labelKey: 'managerProfile.permissions.manageObjectsLabel', detailKey: 'managerProfile.permissions.manageObjectsDetail', icon: 'storefront' },
    { labelKey: 'managerProfile.permissions.manageLocalitiesLabel', detailKey: 'managerProfile.permissions.manageLocalitiesDetail', icon: 'location_city' },
    { labelKey: 'managerProfile.permissions.manageLocalityImagesLabel', detailKey: 'managerProfile.permissions.manageLocalityImagesDetail', icon: 'image' },
    { labelKey: 'managerProfile.permissions.reviewDeletionRequestsLabel', detailKey: 'managerProfile.permissions.reviewDeletionRequestsDetail', icon: 'delete_sweep' },
    { labelKey: 'managerProfile.permissions.manageReportsLabel', detailKey: 'managerProfile.permissions.manageReportsDetail', icon: 'article' },
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
  passwordChangeStep: PasswordChangeStep = 'credentials';
  passwordError = '';
  passwordInfo = '';
  passwordLoading = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmNewPassword = true;
  otpCode = '';
  otpDemoCode = '';
  otpSecondsRemaining = 0;
  otpResendSecondsRemaining = 0;
  languageMenuOpen = false;
  countryMenuOpen = false;

  private cropPreviewUrl: string | null = null;
  private pendingCroppedBlob: Blob | null = null;
  private otpExpiryTimerId: number | null = null;
  private otpResendTimerId: number | null = null;
  private permissionsModalCloseTimerId: number | null = null;
  private passwordModalCloseTimerId: number | null = null;

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
    this.clearPasswordTimers();
    this.unlockBodyScroll();
  }

  get cropPreview(): string | null {
    return this.cropPreviewUrl;
  }

  get displayName(): string {
    return `${this.user.firstName} ${this.user.lastName}`.trim() || this.translationService.translate('adminProfile.unknownUser');
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
      this.avatarUrl = ProfileComponentManager.DEFAULT_PROFILE_IMAGE_URL;
      return;
    }

    this.authService.removeProfileImage(this.user.id).subscribe({
      next: (updated) => {
        const mergedUser = this.mergeUserState({
          ...updated,
          profileImageUrl:
            updated.profileImageUrl?.trim() || ProfileComponentManager.DEFAULT_PROFILE_IMAGE_URL,
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
        this.avatarUrl = ProfileComponentManager.DEFAULT_PROFILE_IMAGE_URL;
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
    if (!this.user.email || this.passwordModalState !== 'closed') return;

    this.passwordModalState = 'opening';
    this.passwordChangeStep = 'credentials';
    this.passwordError = '';
    this.passwordInfo = '';
    this.passwordLoading = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.hideCurrentPassword = true;
    this.hideNewPassword = true;
    this.hideConfirmNewPassword = true;
    this.otpCode = '';
    this.otpDemoCode = '';
    this.otpSecondsRemaining = 0;
    this.otpResendSecondsRemaining = 0;
    this.clearPasswordTimers();
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
    this.passwordInfo = '';
    this.clearPasswordTimers();

    if (this.passwordModalCloseTimerId) {
      window.clearTimeout(this.passwordModalCloseTimerId);
    }

    this.passwordModalCloseTimerId = window.setTimeout(() => {
      this.passwordModalState = 'closed';
      this.passwordChangeStep = 'credentials';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.otpCode = '';
      this.otpDemoCode = '';
      this.otpSecondsRemaining = 0;
      this.otpResendSecondsRemaining = 0;
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
    this.passwordInfo = '';

    if (!this.currentPassword.trim()) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.currentRequired');
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.minLength');
      return;
    }

    if (!/[A-Z]/.test(this.newPassword) || !/[\d\W]/.test(this.newPassword)) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.complexity');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.mismatch');
      return;
    }

    this.passwordChangeStep = 'otp';
    this.otpCode = '';
    this.otpDemoCode = this.generateDemoOtpCode();
    this.passwordInfo = this.translationService.translate('adminProfile.password.demoVerificationCode', { code: this.otpDemoCode });
    this.startOtpCountdown();
  }

  submitOtpStep(): void {
    if (this.passwordLoading) return;

    this.passwordError = '';
    this.passwordInfo = '';

    if (!/^\d{6}$/.test(this.otpCode.trim())) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.codeRequired');
      return;
    }

    if (!this.otpDemoCode) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.sessionExpired');
      return;
    }

    if (this.otpCode.trim() !== this.otpDemoCode) {
      this.passwordError = this.translationService.translate('adminProfile.password.errors.invalidCode');
      return;
    }

    const dto = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmNewPassword,
    };

    this.showSaveSuccess();
    this.closePasswordModal(true);

    this.authService.changePassword(this.user.id!, dto).subscribe({
      error: (err) => {
        this.passwordError = err?.error?.message ?? err?.error?.title ?? this.translationService.translate('adminProfile.password.errors.changeFailed');
      },
    });
  }

  resendOtpCode(): void {
    if (this.passwordLoading || this.otpResendSecondsRemaining > 0) return;

    this.passwordError = '';
    this.passwordInfo = '';
    this.otpDemoCode = this.generateDemoOtpCode();
    this.otpCode = '';
    this.passwordInfo = this.translationService.translate('adminProfile.password.demoVerificationCode', { code: this.otpDemoCode });
    this.startOtpCountdown();
  }

  backToPasswordStep(): void {
    if (this.passwordLoading) return;

    this.passwordChangeStep = 'credentials';
    this.passwordError = '';
    this.passwordInfo = '';
    this.otpCode = '';
    this.otpDemoCode = '';
    this.clearPasswordTimers();
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
      country: ProfileComponentManager.normalizeCountry(user.country),
      dateOfBirth: this.normalizeDateForInput(user.dateOfBirth),
    };
    this.initials = this.buildInitials(user);
    this.role = this.authService.getNormalizedRole(user) ?? '';
    this.avatarUrl = user.profileImageUrl?.trim() || ProfileComponentManager.DEFAULT_PROFILE_IMAGE_URL;
  }

  private mergeUserState(updated: UserDto): UserDto {
    return {
      ...this.user,
      ...updated,
      profileImageUrl:
        updated.profileImageUrl?.trim() ||
        this.user.profileImageUrl ||
        ProfileComponentManager.DEFAULT_PROFILE_IMAGE_URL,
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
    this.clearPasswordTimers();
    this.otpSecondsRemaining = ProfileComponentManager.OTP_EXPIRY_SECONDS;
    this.otpResendSecondsRemaining = ProfileComponentManager.OTP_RESEND_SECONDS;

    this.otpExpiryTimerId = window.setInterval(() => {
      this.otpSecondsRemaining = Math.max(0, this.otpSecondsRemaining - 1);

      if (this.otpSecondsRemaining === 0) {
        this.passwordError = this.translationService.translate('adminProfile.password.errors.codeExpired');
        this.clearOtpExpiryTimer();
      }
    }, 1000);

    this.otpResendTimerId = window.setInterval(() => {
      this.otpResendSecondsRemaining = Math.max(0, this.otpResendSecondsRemaining - 1);

      if (this.otpResendSecondsRemaining === 0) {
        this.clearOtpResendTimer();
      }
    }, 1000);
  }

  private clearPasswordTimers(): void {
    this.clearOtpExpiryTimer();
    this.clearOtpResendTimer();

    if (this.passwordModalCloseTimerId !== null) {
      window.clearTimeout(this.passwordModalCloseTimerId);
      this.passwordModalCloseTimerId = null;
    }
  }

  private clearPermissionsModalTimer(): void {
    if (this.permissionsModalCloseTimerId !== null) {
      window.clearTimeout(this.permissionsModalCloseTimerId);
      this.permissionsModalCloseTimerId = null;
    }
  }

  private clearOtpExpiryTimer(): void {
    if (this.otpExpiryTimerId !== null) {
      window.clearInterval(this.otpExpiryTimerId);
      this.otpExpiryTimerId = null;
    }
  }

  private clearOtpResendTimer(): void {
    if (this.otpResendTimerId !== null) {
      window.clearInterval(this.otpResendTimerId);
      this.otpResendTimerId = null;
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

  private generateDemoOtpCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString();
  }
}
