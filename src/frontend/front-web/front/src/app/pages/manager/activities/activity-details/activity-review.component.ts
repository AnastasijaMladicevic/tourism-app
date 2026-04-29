import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import * as L from 'leaflet';
import { ActivitiesService, ActivityDto, ActivityImageDto, ApproveActivityDto } from '../../../../services/activities';

@Component({
  selector: 'app-manager-activity-review',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './activity-review.component.html',
  styleUrls: ['./activity-review.component.css']
})
export class ManagerActivityReviewComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('activityMap') private activityMap?: ElementRef<HTMLDivElement>;

  private readonly defaultMapCenter: [number, number] = [42.424, 18.771];
  private readonly defaultMapZoom = 13;

  private map: L.Map | null = null;
  private mapMarker: L.Marker | null = null;

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
    approvedByUserId: [''],
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

  ngAfterViewInit(): void {
    this.initializeMap();
    this.syncMapFromActivity();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.mapMarker = null;
  }

  loadActivity(): void {
    if (!this.activityId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.activitiesService.getById(this.activityId).pipe(
      finalize(() => {
        this.isLoading = false;
        setTimeout(() => {
          this.initializeMap();
          this.syncMapFromActivity();
        });
      })
    ).subscribe({
      next: (activity) => {
        if (!activity) {
          this.activity = null;
          this.errorMessage = 'Activity details are unavailable.';
          return;
        }

        this.activity = activity;
        this.selectedImageUrl = activity.mainImageUrl ?? '';

        this.patchForm(activity);
        this.form.disable({ emitEvent: false });
        this.rejectionReason = activity.rejectionReason?.trim() ?? '';
        this.syncMapFromActivity();
        this.loadActivityImages(activity.id, activity.mainImageUrl);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load activity';
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
      });
  }

  patchForm(activity: ActivityDto): void {
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
      createdByUserId: activity.createdByUserId ? `User #${activity.createdByUserId}` : '—',
      createdAt: this.formatDateTime(activity.createdAt),
      updatedAt: this.formatDateTime(activity.updatedAt),
      approvedAt: this.formatDateTime(activity.approvedAt),
      approvedByUserId: activity.approvedByUserId ? `User #${activity.approvedByUserId}` : '—',
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
      })
    ).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.rejectionReason = activity.rejectionReason?.trim() ?? '';
        this.patchForm(activity);
        this.form.disable({ emitEvent: false });
        this.successMessage = 'Activity approved successfully.';
        setTimeout(() => this.router.navigate(['/manager/activities']), 1000);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to approve activity';
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
      })
    ).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.showDeclineModal = false;
        this.rejectionReason = activity.rejectionReason?.trim() ?? this.rejectionReason.trim();
        this.patchForm(activity);
        this.form.disable({ emitEvent: false });
        this.successMessage = 'Activity declined successfully.';
        setTimeout(() => this.router.navigate(['/manager/activities']), 1000);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to decline activity';
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

  get hasCoordinates(): boolean {
    return this.latitudeNumber != null && this.longitudeNumber != null;
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

  get statusTooltip(): string {
    if (this.reviewStatusKey === 'rejected' && this.rejectionReason.trim()) {
      return this.rejectionReason.trim();
    }

    return `Submitted by user #${this.activity?.createdByUserId ?? '-'}`;
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

  private initializeMap(): void {
    if (!this.activityMap || this.map) {
      return;
    }

    const center: L.LatLngExpression = this.hasCoordinates
      ? [this.latitudeNumber as number, this.longitudeNumber as number]
      : this.defaultMapCenter;

    this.map = L.map(this.activityMap.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false
    }).setView(center, this.hasCoordinates ? 15 : this.defaultMapZoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  private syncMapFromActivity(): void {
    if (!this.map || !this.hasCoordinates) {
      return;
    }

    this.updateMapMarker(this.latitudeNumber as number, this.longitudeNumber as number);
  }

  private updateMapMarker(latitude: number, longitude: number): void {
    if (!this.map) {
      return;
    }

    if (!this.mapMarker) {
      const markerIcon = L.icon({
        iconUrl: 'assets/marker-icon.png',
        iconRetinaUrl: 'assets/marker-icon-2x.png',
        shadowUrl: 'assets/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      this.mapMarker = L.marker([latitude, longitude], { icon: markerIcon, draggable: false }).addTo(this.map);
    } else {
      this.mapMarker.setLatLng([latitude, longitude]);
    }

    const targetZoom = Math.max(this.map.getZoom(), 15);
    this.map.flyTo([latitude, longitude], targetZoom, { duration: 0.8 });
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}