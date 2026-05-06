import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { environment } from '../../../../environment/environment';
import { AuthService, UpdateUserDto } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIcon, ImageCropperComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  private static readonly DEFAULT_PROFILE_IMAGE_URL =
    `${environment.apiUrl.replace('/api', '')}/images/profiles/default_icon.png`;

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

  private cropPreviewUrl: string | null = null;
  private pendingCroppedBlob: Blob | null = null;

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
      this.avatarUrl = ProfileComponent.DEFAULT_PROFILE_IMAGE_URL;
      return;
    }

    this.authService.removeProfileImage(this.user.id).subscribe({
      next: (updated) => {
        const mergedUser = this.mergeUserState({
          ...updated,
          profileImageUrl:
            updated.profileImageUrl?.trim() || ProfileComponent.DEFAULT_PROFILE_IMAGE_URL,
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
        this.avatarUrl = ProfileComponent.DEFAULT_PROFILE_IMAGE_URL;
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
    if (!this.user.email) return;
    this.authService.forgotPassword(this.user.email).subscribe({
      next: () => alert('Password reset email sent.'),
      error: (err) => console.error('Reset failed', err),
    });
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
      dateOfBirth: this.normalizeDateForInput(user.dateOfBirth),
    };
    this.initials = this.buildInitials(user);
    this.role = this.authService.getNormalizedRole(user) ?? '';
    this.avatarUrl = user.profileImageUrl?.trim() || ProfileComponent.DEFAULT_PROFILE_IMAGE_URL;
  }

  private mergeUserState(updated: UserDto): UserDto {
    return {
      ...this.user,
      ...updated,
      profileImageUrl:
        updated.profileImageUrl?.trim() ||
        this.user.profileImageUrl ||
        ProfileComponent.DEFAULT_PROFILE_IMAGE_URL,
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
}
