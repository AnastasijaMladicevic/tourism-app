import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';
import { ActivitiesService, ActivityDto, ApproveActivityDto } from '../../../../services/activities';

interface ActivityDetailRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-manager-activity-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.css']
})
export class ManagerActivityDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('activityMap') private activityMap?: ElementRef<HTMLDivElement>;

  private readonly defaultMapCenter: L.LatLngExpression = [42.424, 18.771];
  private readonly defaultMapZoom = 13;

  private map: L.Map | null = null;
  private mapMarker: L.Marker | null = null;
  private viewReady = false;

  activity: ActivityDto | null = null;
  activityId: number | null = null;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  reviewStatus = '';
  rejectionReason = '';
  showDeclineModal = false;
  isImagePreviewBroken = false;

  readonly durationLabel: string = '';
  readonly priceLabel: string = '';

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['id']) {
        this.activityId = Number(params['id']);
        this.loadActivity();
      } else {
        this.errorMessage = 'Activity id is required for manager review.';
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;

    if (this.activity) {
      this.renderMap();
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  loadActivity(): void {
    if (!this.activityId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.activitiesService.getById(this.activityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activity: ActivityDto) => {
          this.activity = activity;
          this.reviewStatus = this.getReviewStatusLabel(activity.status);
          this.isLoading = false;
          this.renderMap();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load activity';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  approveActivity(): void {
    if (!this.activityId || this.isSubmitting || this.reviewStatus === 'Approved') {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto: ApproveActivityDto = { approve: true };

    this.activitiesService.approve(this.activityId, dto)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activity) => {
          this.reviewStatus = this.getReviewStatusLabel(activity.status);
          this.successMessage = 'Activity approved successfully.';
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

    this.rejectionReason = '';
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

    this.activitiesService.approve(this.activityId, dto)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activity) => {
          this.showDeclineModal = false;
          this.reviewStatus = this.getReviewStatusLabel(activity.status);
          this.successMessage = 'Activity declined successfully.';
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

  get imagePreviewUrl(): string {
    return (this.activity?.mainImageUrl ?? '').trim();
  }

  get hasCoordinates(): boolean {
    return this.toNumber(this.activity?.latitude) != null && this.toNumber(this.activity?.longitude) != null;
  }

  onImagePreviewError(): void {
    this.isImagePreviewBroken = true;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('sr-RS', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  getDurationLabel(activity: ActivityDto): string {
    if (!activity.durationMinutes) return 'N/A';
    const hours = Math.floor(activity.durationMinutes / 60);
    const minutes = activity.durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  getPriceLabel(activity: ActivityDto): string {
    if (activity.price === null || activity.price === undefined) return 'Free';
    return `€${activity.price.toFixed(2)}`;
  }

  getActivityTypeLabel(activity: ActivityDto): string {
    return activity.activityTypeName || `Type #${activity.activityTypeId}`;
  }

  getActivityIcon(activity: ActivityDto): string {
    const typeName = (activity.activityTypeName || '').toLowerCase();
    const iconMap: { [key: string]: string } = {
      tour: 'map',
      workshop: 'school',
      sport: 'sports_soccer',
      cultural: 'museum',
      dining: 'restaurant',
      wellness: 'spa',
      outdoor: 'hiking',
      adventure: 'hiking'
    };
    return iconMap[typeName] || 'place';
  }

  getLocation(activity: ActivityDto): string {
    if (activity.objectName) return activity.objectName;
    if (activity.localityName) return activity.localityName;
    if (activity.destinationName) return activity.destinationName;
    return 'Unknown location';
  }

  getLocationSub(activity: ActivityDto): string {
    const parts = [];
    if (activity.localityName && activity.objectName) {
      parts.push(activity.localityName);
    }
    if (activity.destinationName && activity.localityName) {
      parts.push(activity.destinationName);
    }
    return parts.join(' • ') || '';
  }

  getDetailMetrics(): ActivityDetailRow[] {
    if (!this.activity) return [];
    return [
      { label: 'Activity Type', value: this.getActivityTypeLabel(this.activity) },
      { label: 'Duration', value: this.getDurationLabel(this.activity) },
      { label: 'Price', value: this.getPriceLabel(this.activity) },
      { label: 'Created', value: this.formatDate(this.activity.createdAt) },
      { label: 'Updated', value: this.formatDate(this.activity.updatedAt) }
    ];
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getReviewStatusLabel(status: string | undefined): string {
    const normalized = (status || 'Pending').trim().toLowerCase();

    if (normalized === 'approved') {
      return 'Approved';
    }

    if (normalized === 'rejected') {
      return 'Rejected';
    }

    return 'Pending';
  }

  getReviewStatusClass(status: string | undefined): string {
    const normalized = (status || 'Pending').trim().toLowerCase();

    if (normalized === 'approved') {
      return 'status-active';
    }

    if (normalized === 'rejected') {
      return 'status-inactive';
    }

    return 'status-pending';
  }

  private renderMap(): void {
    if (!this.viewReady || !this.activityMap) {
      return;
    }

    this.destroyMap();

    const latitude = this.toNumber(this.activity?.latitude);
    const longitude = this.toNumber(this.activity?.longitude);
    const center: L.LatLngExpression = latitude != null && longitude != null
      ? [latitude, longitude]
      : this.defaultMapCenter;
    const zoom = latitude != null && longitude != null ? 15 : this.defaultMapZoom;

    this.map = L.map(this.activityMap.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true
    }).setView(center, zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    if (latitude != null && longitude != null) {
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
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.mapMarker = null;
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
