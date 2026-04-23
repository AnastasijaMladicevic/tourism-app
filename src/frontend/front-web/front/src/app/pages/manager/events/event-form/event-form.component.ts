import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { EventService } from '../../../../services/event.service';
import { ApproveContentDto, EventDto } from '../../../../models/event.model';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class ManagerEventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

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
  organizerName = 'Current Manager';
  venueSearchTerm = 'Grand Horizon Resort';
  selectedActivityIds = new Set<number>([2]);

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

  get selectedVenue(): VenueOption {
    const term = this.venueSearchTerm.trim().toLowerCase();
    return this.venueOptions.find((venue) => venue.name.toLowerCase().includes(term)) ?? this.venueOptions[0];
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

  loadEvent(): void {
    if (!this.eventId) {
      return;
    }

    this.isLoading = true;
    this.eventService.getById(this.eventId).subscribe({
      next: (event: EventDto) => {
        this.populateForm(event);
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
      objectId: this.selectedVenue.id.toString(),
      imageUrl: event.mainImageUrl ?? '',
      ageRestriction: '',
      tagsInput: ''
    });
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
    return (this.form.get('imageUrl')?.value ?? '').trim();
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
