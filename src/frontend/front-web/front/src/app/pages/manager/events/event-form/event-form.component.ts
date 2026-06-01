import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapComponent } from '../../../../shared/components/map/map';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { EventImageDto, EventService } from '../../../../services/event.service';
import { ApproveContentDto, EventDto } from '../../../../models/event.model';
import { environment } from '../../../../../environment/environment';
import { TranslationService } from '../../../../services/translation.service';

interface VenueOption {
  id: number;
  name: string;
  address: string;
}

interface RelatedActivity {
  id: number;
  name: string;
  meta: string;
}

@Component({
  selector: 'app-manager-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapComponent],
  templateUrl: './event-form.component.html',
  styleUrls: [
    './event-form.component.css',
    '../../../admin/shared/admin-page-title.css',
    '../../shared/manager-list-page-header.css',
    '../../shared/manager-list-page-responsive.css'
  ]
})
export class ManagerEventFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private readonly translationService = inject(TranslationService);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    eventTypeId: ['', Validators.required],
    startDate: ['', Validators.required],
    startTime: ['18:30'],
    endDate: [''],
    endTime: ['22:00'],
    timezone: ['Europe/Belgrade'],
    recurringEvent: [false],
    recurrencePattern: [''],
    price: [''],
    maxVisitors: [''],
    externalLink: [''],
    imageUrl: [''],
    longitude: [''],
    latitude: [''],
    localityId: [''],
    destinationId: [''],
    objectId: [''],
    ageRestriction: [''],
    tagsInput: ['']
  });

  isLoading = false;
  isEditMode = false;
  eventId: number | null = null;
  errorMessage = '';
  successMessage = '';
  isSubmitting = false;
  isReviewMode = true;
  reviewTargetName = '';
  reviewStatus = '';
  rejectionReason = '';
  showDeclineModal = false;
  isImageDropActive = false;
  isImagePreviewBroken = false;
  eventImages: EventImageDto[] = [];
  selectedReviewImageUrl = '';
  organizerName = 'Current Manager';
  selectedActivityIds = new Set<number>([2]);
  loadedEvent: EventDto | null = null;
  createdByName = '';

  readonly eventTypes = [
    { id: 1, name: 'Festival' },
    { id: 2, name: 'Workshop' },
    { id: 3, name: 'Sports' },
    { id: 4, name: 'Cultural' },
    { id: 5, name: 'Exhibition' },
    { id: 6, name: 'Concert' }
  ];

  readonly destinations = [
    { id: 1, name: 'Belgrade' },
    { id: 2, name: 'Novi Sad' },
    { id: 3, name: 'Kopaonik' },
    { id: 4, name: 'Nis' }
  ];

  readonly venueOptions: VenueOption[] = [
    { id: 1, name: 'Grand Horizon Resort', address: 'Azure Coast Drive 15, North Shore Complex, Belgrade, 11000, Serbia' },
    { id: 2, name: 'Sunset Pavilion', address: 'Riverside Promenade 8, Novi Sad, Serbia' },
    { id: 3, name: 'City Museum Courtyard', address: 'Old Town Square 3, Nis, Serbia' }
  ];

  readonly relatedActivities: RelatedActivity[] = [
    { id: 1, name: 'Sunset Boat Tour', meta: 'Activity • 2 hrs' },
    { id: 2, name: 'Vineyard Tasting', meta: 'Activity • 3 hrs' },
    { id: 3, name: 'Local Food Walk', meta: 'Activity • 90 mins' }
  ];

  readonly timezoneOptions = [
    'Europe/Belgrade',
    'Europe/London',
    'Europe/Paris',
    'UTC'
  ];

  readonly ageRestrictionOptions = [
    'All ages',
    '12+',
    '16+',
    '18+'
  ];

  readonly tags = ['Outdoor', 'Live Music', 'Summer'];
  pendingTag = '';

  get ticketPriceLabel(): string {
    return this.translationService.translate('event.ticketPrice');
  }

  get selectedVenue(): VenueOption {
    if (this.loadedEvent) {
      return {
        id: this.loadedEvent.objectId ?? 0,
        name: this.loadedEvent.objectName || this.loadedEvent.localityName || this.loadedEvent.destinationName || 'Linked location',
        address: [
          this.loadedEvent.localityName,
          this.loadedEvent.destinationName
        ].filter((value): value is string => !!value && value.trim().length > 0).join(', ') || 'No address available'
      };
    }

    return this.venueOptions[0];
  }

  get locationContextValue(): string {
    return this.selectedVenue.address || this.selectedVenue.name;
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
    if (!this.loadedEvent) {
      return '';
    }

    const created = this.formatMonthYear(this.loadedEvent.createdAt);
    const updated = this.formatMonthYear(this.loadedEvent.updatedAt);
    if (created && updated && created !== updated) {
      return `${created}, edited ${updated}`;
    }

    return created || updated || '';
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.organizerName = `${user.firstName} ${user.lastName}`.trim();
    }

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.eventId = Number(params['id']);
        this.loadEvent();
      } else {
        this.errorMessage = 'Event id is required for manager review.';
      }
    });
  }

  ngOnDestroy(): void { }

  loadEvent(): void {
    if (!this.eventId) {
      return;
    }

    this.isLoading = true;
    this.eventService.getById(this.eventId).subscribe({
      next: (event: EventDto) => {
        this.populateForm(event);
        this.loadEventImages(event.id, event.mainImageUrl);
        this.resolveCreatorName(event);
        this.reviewTargetName = event.name;
        this.reviewStatus = event.status;
        this.form.disable({ emitEvent: false });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load event';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  populateForm(event: EventDto): void {
    this.loadedEvent = event;
    this.form.patchValue({
      name: event.name,
      description: event.description,
      eventTypeId: event.eventTypeId?.toString() || '',
      startDate: this.formatDateOnlyForInput(event.startDate),
      startTime: this.formatTimeForInput(event.startDate),
      endDate: this.formatDateOnlyForInput(event.endDate),
      endTime: this.formatTimeForInput(event.endDate),
      timezone: 'Europe/Belgrade',
      recurringEvent: false,
      recurrencePattern: '',
      price: event.price?.toString() || '',
      maxVisitors: event.maxVisitors?.toString() || '',
      externalLink: '',
      longitude: event.longitude?.toString() || '',
      latitude: event.latitude?.toString() || '',
      localityId: '',
      destinationId: '',
      objectId: event.objectId?.toString() || '',
      imageUrl: event.mainImageUrl ?? '',
      ageRestriction: '',
      tagsInput: ''
    });
    this.selectedReviewImageUrl = event.mainImageUrl ?? '';
  }

  private resolveCreatorName(event: EventDto): void {
    const directName = event.createdByFullName?.trim();
    if (directName) {
      this.createdByName = directName;
      return;
    }

    if (!event.createdByUserId) {
      this.createdByName = '';
      return;
    }

    this.http
      .get<{ firstName?: string; lastName?: string }>(`${environment.apiUrl}/users/${event.createdByUserId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        const first = user?.firstName?.trim() ?? '';
        const last = user?.lastName?.trim() ?? '';
        this.createdByName = `${first} ${last}`.trim();
        this.cdr.detectChanges();
      });
  }

  private loadEventImages(eventId: number, fallbackImageUrl?: string): void {
    this.eventService
      .getImages(eventId)
      .pipe(catchError(() => of([] as EventImageDto[])))
      .subscribe((images) => {
        this.eventImages = this.normalizeEventImages(images, fallbackImageUrl);

        this.selectedReviewImageUrl =
          this.eventImages.find((image) => image.isMain)?.url ??
          this.eventImages[0]?.url ??
          fallbackImageUrl?.trim() ??
          '';

        this.form.patchValue({ imageUrl: this.selectedReviewImageUrl }, { emitEvent: false });
        this.cdr.detectChanges();
      });
  }

  private normalizeEventImages(images: EventImageDto[], fallbackImageUrl?: string): EventImageDto[] {
    const fallback = fallbackImageUrl?.trim() ?? '';
    const list = (Array.isArray(images) ? images : [])
      .filter((image) => image.url?.trim())
      .map((image) => ({ ...image, url: image.url.trim() }));

    if (fallback && !list.some((image) => image.url === fallback)) {
      list.unshift({
        id: 0,
        url: fallback,
        isMain: !list.some((image) => image.isMain),
        altText: '',
      });
    }

    if (list.length === 0 && fallback) {
      return [{ id: 0, url: fallback, isMain: true, altText: '' }];
    }

    return list.slice().sort((left, right) => Number(right.isMain) - Number(left.isMain));
  }

  toNumber(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  approveEvent(): void {
    if (!this.eventId || this.isSubmitting || this.reviewStatus === 'Approved') {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto: ApproveContentDto = { approve: true };

    this.eventService.approve(this.eventId, dto).pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (event) => {
        this.reviewStatus = event.status;
        this.successMessage = 'Event approved successfully.';
        setTimeout(() => this.router.navigate(['/manager/events']), 1000);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to approve event';
        this.cdr.detectChanges();
      }
    });
  }

  openDeclineModal(): void {
    if (!this.eventId || this.isSubmitting) {
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

  declineEvent(): void {
    if (!this.eventId || this.isSubmitting) {
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.errorMessage = 'Please provide a reason for decline.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto: ApproveContentDto = {
      approve: false,
      rejectionReason: this.rejectionReason.trim()
    };

    this.eventService.approve(this.eventId, dto).pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (event) => {
        this.showDeclineModal = false;
        this.reviewStatus = event.status;
        this.successMessage = 'Event declined successfully.';
        setTimeout(() => this.router.navigate(['/manager/events']), 1000);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to decline event';
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/manager/events']);
  }

  onImageUrlChange(value: string): void {
    if (this.isReviewMode) {
      return;
    }

    this.isImagePreviewBroken = false;
    this.form.patchValue({ imageUrl: value.trim() }, { emitEvent: false });
  }

  get imagePreviewUrl(): string {
    return this.selectedReviewImageUrl.trim() || (this.form.get('imageUrl')?.value ?? '').trim();
  }

  selectReviewImage(url: string): void {
    this.selectedReviewImageUrl = url?.trim() ?? '';
    this.isImagePreviewBroken = false;
    this.form.patchValue({ imageUrl: this.selectedReviewImageUrl }, { emitEvent: false });
  }

  get sideGalleryImages(): EventImageDto[] {
    const selectedUrl = this.imagePreviewUrl.trim();
    if (!selectedUrl) {
      return this.eventImages;
    }

    let removedSelectedOnce = false;
    return this.eventImages.filter((image) => {
      const isSelected = image.url.trim() === selectedUrl;
      if (isSelected && !removedSelectedOnce) {
        removedSelectedOnce = true;
        return false;
      }

      return true;
    });
  }

  onImageDrop(event: DragEvent): void {
    if (this.isReviewMode) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.isImageDropActive = false;

    const droppedUrl = this.getDroppedImageUrl(event);
    if (!droppedUrl) {
      return;
    }

    this.form.patchValue({ imageUrl: droppedUrl });
    this.isImagePreviewBroken = false;
    this.cdr.detectChanges();
  }

  onImageDragOver(event: DragEvent): void {
    if (this.isReviewMode) {
      return;
    }

    event.preventDefault();
    this.isImageDropActive = true;
  }

  onImageDragLeave(event: DragEvent): void {
    if (this.isReviewMode) {
      return;
    }

    event.preventDefault();
    this.isImageDropActive = false;
  }

  onImagePreviewError(): void {
    this.isImagePreviewBroken = true;
  }

  clearImage(): void {
    if (this.isReviewMode) {
      return;
    }

    this.form.patchValue({ imageUrl: '' });
    this.isImagePreviewBroken = false;
    this.isImageDropActive = false;
    this.cdr.detectChanges();
  }

  toggleActivity(activityId: number): void {
    if (this.isReviewMode) {
      return;
    }

    if (this.selectedActivityIds.has(activityId)) {
      this.selectedActivityIds.delete(activityId);
      return;
    }

    this.selectedActivityIds.add(activityId);
  }

  addTag(): void {
    if (this.isReviewMode) {
      return;
    }

    const tag = this.pendingTag.trim();
    if (!tag) {
      return;
    }

    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }

    this.pendingTag = '';
  }

  removeTag(tag: string): void {
    if (this.isReviewMode) {
      return;
    }

    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  private formatDateOnlyForInput(date: string | Date | undefined): string {
    if (!date) {
      return '';
    }

    const parsed = new Date(date);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimeForInput(date: string | Date | undefined): string {
    if (!date) {
      return '22:00';
    }

    const parsed = new Date(date);
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
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

  private getDroppedImageUrl(event: DragEvent): string {
    const transfer = event.dataTransfer;
    if (!transfer) {
      return '';
    }

    const files = transfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
    }

    const plainText = transfer.getData('text/uri-list') || transfer.getData('text/plain');
    const normalizedPlainText = plainText.trim();
    if (this.isValidImageUrl(normalizedPlainText)) {
      return normalizedPlainText;
    }

    const html = transfer.getData('text/html');
    const extractedFromHtml = this.extractImageUrlFromHtml(html);
    if (this.isValidImageUrl(extractedFromHtml)) {
      return extractedFromHtml;
    }

    return '';
  }

  private extractImageUrlFromHtml(html: string): string {
    if (!html) {
      return '';
    }

    const srcMatch = html.match(/src=["']([^"']+)["']/i);
    if (srcMatch?.[1]) {
      return srcMatch[1].trim();
    }

    const hrefMatch = html.match(/href=["']([^"']+)["']/i);
    if (hrefMatch?.[1]) {
      return hrefMatch[1].trim();
    }

    return '';
  }

  private isValidImageUrl(value: string): boolean {
    if (!value) {
      return false;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
