import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { AuthService, UpdateUserDto } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIcon, ImageCropperComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  user: UserDto = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    country: '',
    language: ''
  };

  initials = '';
  role = '';
  avatarUrl: string | null = null;
  cropPreview: string | null = null;
  pendingCropFile: File | null = null;
  croppedAvatarFile: File | null = null;
  isSaving = false;
  saveSuccess = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const userData = this.authService.getUser();

    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    this.syncUserState(userData);
  }

  private buildInitials(user: UserDto): string {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  }

  private syncUserState(user: UserDto): void {
    this.user = { ...user };
    this.initials = this.buildInitials(user);
    this.role = this.authService.getNormalizedRole(user) ?? '';
    this.avatarUrl = user.profileImageUrl || null;
  }

  private clearCropState(resetInput = false): void {
    this.pendingCropFile = null;
    this.croppedAvatarFile = null;
    this.cropPreview = null;

    if (resetInput && this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private showSaveSuccess(): void {
    this.saveSuccess = true;
    setTimeout(() => {
      this.saveSuccess = false;
    }, 2500);
  }

  get displayName(): string {
    return `${this.user.firstName} ${this.user.lastName}`.trim() || 'Unknown User';
  }

  get roleBadgeClass(): string {
    switch (this.role) {
      case 'admin': return 'badge-red';
      case 'manager': return 'badge-purple';
      case 'content-creator': return 'badge-amber';
      default: return 'badge-blue';
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    this.pendingCropFile = file;
    this.croppedAvatarFile = null;
    this.cropPreview = null;
  }

  onImageCropped(event: ImageCroppedEvent): void {
    this.cropPreview = event.base64 ?? null;
    this.croppedAvatarFile = event.blob
      ? new File([event.blob], 'profile-avatar.png', { type: event.blob.type || 'image/png' })
      : null;
  }

  confirmCrop(): void {
    if (!this.user.id || !this.croppedAvatarFile) return;

    const previousAvatarUrl = this.avatarUrl;
    if (this.cropPreview) {
      this.avatarUrl = this.cropPreview;
    }

    this.authService.updateProfileImage(this.user.id, this.croppedAvatarFile).subscribe({
      next: (updated) => {
        this.authService.setCurrentUser(updated);
        this.syncUserState(updated);
        this.clearCropState(true);
        this.showSaveSuccess();
      },
      error: (err) => {
        console.error('Avatar upload failed', err);
        this.avatarUrl = previousAvatarUrl;
      }
    });
  }

  cancelCrop(): void {
    this.clearCropState(true);
  }

  removePhoto(): void {
    this.clearCropState(true);
    this.avatarUrl = null;
  }

  saveChanges(): void {
    if (!this.user.id || this.isSaving) return;

    const dto: UpdateUserDto = {
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      phoneNumber: this.user.phoneNumber,
      country: this.user.country,
      language: this.user.language
    };

    this.isSaving = true;
    this.authService.update(this.user.id, dto).subscribe({
      next: (updated) => {
        this.syncUserState(updated);
        this.authService.setCurrentUser(updated);
        this.isSaving = false;
        this.showSaveSuccess();
      },
      error: (err) => {
        console.error('Save failed', err);
        this.isSaving = false;
      }
    });
  }

  resetPassword(): void {
    if (!this.user.email) return;
    this.authService.forgotPassword(this.user.email).subscribe({
      next: () => alert('Password reset email sent.'),
      error: (err) => console.error('Reset failed', err)
    });
  }

  cancel(): void {
    this.router.navigate([this.authService.getDashboardRouteFromStoredUser()]);
  }
}
