import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { environment } from '../../../../environment/environment';
import { AuthService, UpdateUserDto } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';
type PermissionItem = {
  label: string;
  detail: string;
};

type PasswordChangeStep = 'credentials' | 'otp';

type ModalState = 'closed' | 'opening' | 'open' | 'closing';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIcon, ImageCropperComponent],
  templateUrl: '../../admin/profile/profile.component.html',
  styleUrls: ['../../admin/profile/profile.component.css'],
})
export class ProfileComponentManager implements OnInit, OnDestroy {
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    `${environment.apiUrl.replace('/api', '')}/images/profiles/default_icon.png`;

  readonly permissionItems: PermissionItem[] = [
    { label: 'View manager dashboard', detail: 'Open the manager overview.' },
    { label: 'Manage events', detail: 'List assigned events, inspect details, approve them, and toggle active state.' },
    { label: 'Manage activities', detail: 'List assigned activities, inspect details, approve them, and toggle active state.' },
    { label: 'Manage tourist objects', detail: 'List assigned tourist objects, inspect details, approve them, and toggle active state.' },
    { label: 'Manage localities', detail: 'Create, update, toggle active state, and delete localities in the managed destination.' },
    { label: 'Add locality images', detail: 'Upload images for localities that belong to the managed destination.' },
    { label: 'Review deletion requests', detail: 'View and review deletion requests for the managed destination.' },
    { label: 'Manage manager reports', detail: 'Create reports, view your own reports, and withdraw your own reports.' },
  ];

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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

  private cropPreviewUrl: string | null = null;
  private pendingCroppedBlob: Blob | null = null;
  private otpExpiryTimerId: number | null = null;
  private otpResendTimerId: number | null = null;
  private passwordModalCloseTimerId: number | null = null;

  private static readonly OTP_EXPIRY_SECONDS = 300;
  private static readonly OTP_RESEND_SECONDS = 30;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
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
    this.clearPasswordTimers();
    this.unlockBodyScroll();
  }

  get cropPreview(): string | null {
    return this.cropPreviewUrl;
  }

  get displayName(): string {
    return `${this.user.firstName} ${this.user.lastName}`.trim() || 'Unknown User';
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
      this.unlockBodyScroll();
      this.passwordModalCloseTimerId = null;
    }, 220);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.passwordModalState !== 'closed') {
      this.closePasswordModal();
    }
  }

  submitPasswordStep(): void {
    if (this.passwordLoading) return;

    this.passwordError = '';
    this.passwordInfo = '';

    if (!this.currentPassword.trim()) {
      this.passwordError = 'Current password is required.';
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

    this.passwordChangeStep = 'otp';
    this.otpCode = '';
    this.otpDemoCode = this.generateDemoOtpCode();
    this.passwordInfo = `Demo verification code: ${this.otpDemoCode}`;
    this.startOtpCountdown();
  }

  submitOtpStep(): void {
    if (this.passwordLoading) return;

    this.passwordError = '';
    this.passwordInfo = '';

    if (!/^\d{6}$/.test(this.otpCode.trim())) {
      this.passwordError = 'Enter the 6-digit verification code.';
      return;
    }

    if (!this.otpDemoCode) {
      this.passwordError = 'The verification session expired. Resend the code to continue.';
      return;
    }

    if (this.otpCode.trim() !== this.otpDemoCode) {
      this.passwordError = 'Invalid verification code.';
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
        this.passwordError = err?.error?.message ?? err?.error?.title ?? 'Password change failed.';
      },
    });
  }

  resendOtpCode(): void {
    if (this.passwordLoading || this.otpResendSecondsRemaining > 0) return;

    this.passwordError = '';
    this.passwordInfo = '';
    this.otpDemoCode = this.generateDemoOtpCode();
    this.otpCode = '';
    this.passwordInfo = `Demo verification code: ${this.otpDemoCode}`;
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

  private syncUserState(user: UserDto): void {
    this.user = {
      ...user,
      language: user.language?.trim() || 'en',
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
        this.passwordError = 'The verification code has expired. Resend it to continue.';
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

  private generateDemoOtpCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString();
  }
}
