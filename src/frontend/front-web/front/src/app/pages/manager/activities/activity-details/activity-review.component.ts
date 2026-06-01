import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { MapComponent } from '../../../../shared/components/map/map';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ActivitiesService, ActivityDto, ActivityImageDto, ApproveActivityDto } from '../../../../services/activities';
import { environment } from '../../../../../environment/environment';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-manager-activity-review',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapComponent, TranslatePipe],
  templateUrl: './activity-review.component.html',
  styleUrls: [
    './activity-review.component.css',
    '../../../admin/shared/admin-page-title.css',
    '../../shared/manager-list-page-header.css',
    '../../shared/manager-list-page-responsive.css'
  ]
})
export class ManagerActivityReviewComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  readonly translationService = inject(TranslationService);

  activityId: number | null = null;
  activity: ActivityDto | null = null;
  activityImages: ActivityImageDto[] = [];
  selectedImageUrl = '';

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showDeclineModal = false;
  rejectionReason = '';
  isImagePreviewBroken = false;
  createdByName = '';

  form = this.fb.group({
    name: [''],
    description: [''],
    activityTypeName: [''],
    status: [''],
    destinationName: [''],
    localityName: [''],
    objectName: [''],
    price: [''],
    durationMinutes: [''],
    isActive: [''],
    createdByUserId: [''],
    createdAt: [''],
    updatedAt: [''],
    approvedAt: [''],
    approvedByName: [''],
    rejectionReason: [''],
    mainImageUrl: [''],
    latitude: [''],
    longitude: ['']
  });

  ngOnInit(): void {
    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(idFromRoute) || idFromRoute <= 0) {
      this.errorMessage = 'Activity id is required for manager review.';
      this.isLoading = false;
      return;
    }

    this.activityId = idFromRoute;
    this.loadActivity();
  }

  ngOnDestroy(): void { }

  loadActivity(): void {
    if (!this.activityId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.activitiesService.getById(this.activityId).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (activity) => {
        if (!activity) {
          this.activity = null;
          this.errorMessage = 'Activity details are unavailable.';
          this.cdr.detectChanges();
          return;
        }

        this.activity = activity;
        this.selectedImageUrl = activity.mainImageUrl ?? '';

        this.patchForm(activity);
        this.form.disable({ emitEvent: false });
        this.rejectionReason = activity.rejectionReason?.trim() ?? '';
        this.resolveCreatorName(activity);
        this.resolveApproverName(activity);
        this.cdr.detectChanges();
        this.loadActivityImages(activity.id, activity.mainImageUrl);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load activity';
        this.cdr.detectChanges();
      }
    });
  }

  private loadActivityImages(activityId: number, fallbackImageUrl?: string): void {
    this.activitiesService.getImages(activityId)
      .pipe(catchError(() => of([] as ActivityImageDto[])))
      .subscribe((images) => {
        const normalizedImages = Array.isArray(images) ? images : [];
        this.activityImages = normalizedImages
          .slice()
          .sort((left, right) => Number(right.isMain) - Number(left.isMain));

        this.selectedImageUrl = this.activityImages.find((image) => image.isMain)?.url
          ?? this.activityImages[0]?.url
          ?? fallbackImageUrl
          ?? this.selectedImageUrl;

        this.patchImageFieldsFromSelection();
        this.cdr.detectChanges();
      });
  }

  patchForm(activity: ActivityDto): void {
    const creatorFullName = activity.createdByFullName?.trim();
    const approverFullName = activity.approvedByFullName?.trim();

    this.form.patchValue({
      name: activity.name ?? '',
      description: activity.description ?? '',
      activityTypeName: activity.activityTypeName ?? '',
      status: this.getStatusLabel(activity.status),
      destinationName: activity.destinationName ?? '',
      localityName: activity.localityName ?? '',
      objectName: activity.objectName ?? '',
      price: activity.price != null ? this.formatPrice(activity.price) : '',
      durationMinutes: activity.durationMinutes != null ? this.formatDuration(activity.durationMinutes) : '',
      isActive: activity.isActive ? 'Active' : 'Inactive',
      createdByUserId: creatorFullName || 'Unknown content creator',
      createdAt: this.formatDateTime(activity.createdAt),
      updatedAt: this.formatDateTime(activity.updatedAt),
      approvedAt: this.formatDateTime(activity.approvedAt),
      approvedByName: approverFullName || '',
      rejectionReason: activity.rejectionReason?.trim() ?? 'No rejection reason recorded.',
      mainImageUrl: activity.mainImageUrl ?? this.selectedImageUrl,
      latitude: activity.latitude != null ? String(activity.latitude) : '',
      longitude: activity.longitude != null ? String(activity.longitude) : ''
    }, { emitEvent: false });
  }

  private patchImageFieldsFromSelection(): void {
    this.form.patchValue({
      mainImageUrl: this.imagePreviewUrl
    }, { emitEvent: false });
  }

  private resolveApproverName(activity: ActivityDto): void {
    const directName = activity.approvedByFullName?.trim();
    if (directName) {
      this.form.patchValue({ approvedByName: directName }, { emitEvent: false });
      return;
    }

    const approverId = activity.approvedByUserId;
    if (!approverId) {
      return;
    }

    this.http
      .get<{ firstName?: string; lastName?: string }>(`${environment.apiUrl}/users/${approverId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        const first = user?.firstName?.trim() ?? '';
        const last = user?.lastName?.trim() ?? '';
        const fullName = `${first} ${last}`.trim();
        if (!fullName) {
          return;
        }

        this.form.patchValue({ approvedByName: fullName }, { emitEvent: false });
        this.cdr.detectChanges();
      });
  }

  private resolveCreatorName(activity: ActivityDto): void {
    const directName = activity.createdByFullName?.trim();
    if (directName) {
      this.createdByName = directName;
      return;
    }

    if (!activity.createdByUserId) {
      this.createdByName = '';
      return;
    }

    this.http
      .get<{ firstName?: string; lastName?: string }>(`${environment.apiUrl}/users/${activity.createdByUserId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        const first = user?.firstName?.trim() ?? '';
        const last = user?.lastName?.trim() ?? '';
        this.createdByName = `${first} ${last}`.trim();
        this.cdr.detectChanges();
      });
  }

  private formatMonthYear(value?: string | Date): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  approveActivity(): void {
    if (!this.activityId || this.isSubmitting || this.reviewStatusKey === 'approved') {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto: ApproveActivityDto = { approve: true };

    this.activitiesService.approve(this.activityId, dto).pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.rejectionReason = activity.rejectionReason?.trim() ?? '';
        this.patchForm(activity);
        this.form.disable({ emitEvent: false });
        this.resolveCreatorName(activity);
        this.successMessage = 'Activity approved successfully.';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/manager/activities']), 1000);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to approve activity';
        this.cdr.detectChanges();
      }
    });
  }

  openDeclineModal(): void {
    if (!this.activityId || this.isSubmitting) {
      return;
    }

    this.rejectionReason = this.activity?.rejectionReason?.trim() ?? '';
    this.errorMessage = '';
    this.successMessage = '';
    this.showDeclineModal = true;
  }

  closeDeclineModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.showDeclineModal = false;
  }

  declineActivity(): void {
    if (!this.activityId || this.isSubmitting) {
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.errorMessage = 'Please provide a reason for decline.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto: ApproveActivityDto = {
      approve: false,
      rejectionReason: this.rejectionReason.trim()
    };

    this.activitiesService.approve(this.activityId, dto).pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.showDeclineModal = false;
        this.rejectionReason = activity.rejectionReason?.trim() ?? this.rejectionReason.trim();
        this.patchForm(activity);
        this.form.disable({ emitEvent: false });
        this.resolveCreatorName(activity);
        this.successMessage = 'Activity declined successfully.';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/manager/activities']), 1000);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to decline activity';
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/manager/activities']);
  }

  selectImage(url: string): void {
    this.selectedImageUrl = url;
    this.isImagePreviewBroken = false;
    this.patchImageFieldsFromSelection();
  }

  get sideGalleryImages(): ActivityImageDto[] {
    const selectedUrl = this.imagePreviewUrl;
    if (!selectedUrl) {
      return this.activityImages;
    }

    let removedSelectedOnce = false;
    return this.activityImages.filter((image) => {
      const isSelected = image.url === selectedUrl;
      if (isSelected && !removedSelectedOnce) {
        removedSelectedOnce = true;
        return false;
      }

      return true;
    });
  }

  onImagePreviewError(): void {
    this.isImagePreviewBroken = true;
  }

  get imagePreviewUrl(): string {
    return this.selectedImageUrl.trim() || this.form.controls.mainImageUrl.value?.trim() || '';
  }

  get reviewStatusKey(): string {
    return this.activity?.status?.trim().toLowerCase() || 'pending';
  }

  get reviewStatusLabel(): string {
    return this.getStatusLabel(this.activity?.status);
  }

  get activityLocationLabel(): string {
    return this.activity?.destinationName || this.activity?.localityName || this.activity?.objectName || 'Location TBD';
  }

  get locationSubtitle(): string {
    const parts = [this.activity?.localityName, this.activity?.objectName].filter((value) => Boolean(value && value.trim()));
    return parts.length > 0 ? parts.join(' · ') : 'No locality or object has been linked.';
  }

  get locationContextValue(): string {
    const parts = [
      this.activity?.localityName?.trim(),
      this.activity?.destinationName?.trim()
    ].filter((value): value is string => !!value);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    return this.activityLocationLabel;
  }

  get creatorDisplayName(): string {
    return this.createdByName.trim() || 'Name not available in this view.';
  }

  get creatorInitials(): string {
    const fullName = this.createdByName.trim();
    if (!fullName) {
      return '?';
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get creatorTimeline(): string {
    if (!this.activity) {
      return '';
    }

    const created = this.formatMonthYear(this.activity.createdAt);
    const updated = this.formatMonthYear(this.activity.updatedAt);

    if (created && updated && created !== updated) {
      return `${created}, edited ${updated}`;
    }

    return created || updated || '';
  }

  get hasCoordinates(): boolean {
    return this.latitudeNumber != null && this.longitudeNumber != null;
  }

  get latitudeDirection(): 'N' | 'S' {
    const lat = this.latitudeNumber;
    return lat != null && lat < 0 ? 'S' : 'N';
  }

  get longitudeDirection(): 'E' | 'W' {
    const lng = this.longitudeNumber;
    return lng != null && lng < 0 ? 'W' : 'E';
  }

  get latitudeNumber(): number | null {
    return this.toNumber(this.activity?.latitude ?? this.form.controls.latitude.value);
  }

  get longitudeNumber(): number | null {
    return this.toNumber(this.activity?.longitude ?? this.form.controls.longitude.value);
  }

  get mainImageCountLabel(): string {
    if (this.activityImages.length === 0) {
      return 'No gallery images';
    }

    return `${this.activityImages.length} image${this.activityImages.length === 1 ? '' : 's'}`;
  }

  formatDateTime(value: string | Date | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPrice(value: number): string {
    return `€${value.toFixed(2)}`;
  }

  formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) {
      return '—';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${remainingMinutes}m`;
  }

  getStatusLabel(status: string | undefined): string {
    switch ((status ?? '').trim().toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return 'Pending';
    }
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch ((status ?? '').trim().toLowerCase()) {
      case 'approved':
        return 'badge-approved';
      case 'rejected':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private get selectedCoordinates(): { latitude: number; longitude: number } | null {
    const latitude = this.latitudeNumber;
    const longitude = this.longitudeNumber;
    if (latitude == null || longitude == null) {
      return null;
    }

    return { latitude, longitude };
  }
}
