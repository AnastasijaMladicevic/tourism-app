import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { EventService } from '../../../../services/event.service';
import { CreateEventDto, EventDto, UpdateEventDto } from '../../../../models/event.model';

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
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit {
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
  isDeleting = false;
  showDeleteModal = false;
  isImageDropActive = false;
  isImagePreviewBroken = false;
  organizerName = 'Current Content Creator';
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
    { id: 1, name: 'Grand Horizon Resort', address: 'Azure Coast Drive 15, Belgrade, Serbia' },
    { id: 2, name: 'Sunset Pavilion', address: 'Riverside Promenade 8, Novi Sad, Serbia' },
    { id: 3, name: 'City Museum Courtyard', address: 'Old Town Square 3, Nis, Serbia' }
  ];

  readonly relatedActivities: RelatedActivity[] = [
    { id: 1, name: 'Sunset Boat Tour', meta: 'Activity · 2 hrs' },
    { id: 2, name: 'Vineyard Tasting', meta: 'Activity · 3 hrs' },
    { id: 3, name: 'Local Food Walk', meta: 'Activity · 90 mins' }
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

  readonly recurrenceOptions = [
    { value: '', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'custom', label: 'Custom' }
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
      startDate: this.formatDateForInput(event.startDate),
      startTime: '18:30',
      endDate: this.formatDateForInput(event.endDate),
      endTime: '22:00',
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

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.form.getRawValue();

    // Combine startDate + startTime into ISO 8601 UTC datetime
    const startDateTime = this.combineDateAndTime(formValue.startDate, formValue.startTime);
    // Combine endDate + endTime into ISO 8601 UTC datetime
    const endDateTime = formValue.endDate 
      ? this.combineDateAndTime(formValue.endDate, formValue.endTime)
      : undefined;

    const dto: CreateEventDto | UpdateEventDto = {
      name: formValue.name ?? '',
      description: formValue.description ?? undefined,
      eventTypeId: this.parseRequiredNumber(formValue.eventTypeId),
      startDate: startDateTime,
      endDate: endDateTime,
      price: this.parseOptionalNumber(formValue.price),
      maxVisitors: this.parseOptionalNumber(formValue.maxVisitors),
      longitude: this.parseOptionalNumber(formValue.longitude),
      latitude: this.parseOptionalNumber(formValue.latitude),
      localityId: this.parseOptionalNumber(formValue.localityId),
      destinationId: this.parseOptionalNumber(formValue.destinationId),
      objectId: this.parseOptionalNumber(formValue.objectId),
      imageUrl: formValue.imageUrl || undefined
    };

    const request = this.isEditMode && this.eventId
      ? this.eventService.update(this.eventId, dto as UpdateEventDto)
      : this.eventService.create(dto as CreateEventDto);

    request.pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Event updated successfully!' : 'Event created successfully!';
        setTimeout(() => this.router.navigate(['/content-creator/events']), 1200);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to save event';
        this.cdr.detectChanges();
      }
    });
  }

  saveDraft(): void {
    this.successMessage = 'Draft saved locally.';
  }

  cancel(): void {
    this.router.navigate(['/content-creator/events']);
  }

  openDeleteModal(): void {
    if (!this.isEditMode || !this.eventId || this.isSubmitting || this.isDeleting) {
      return;
    }

    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDeleteModal(): void {
    if (this.isDeleting) {
      return;
    }

    this.showDeleteModal = false;
  }

  deleteEvent(): void {
    if (!this.isEditMode || !this.eventId || this.isSubmitting || this.isDeleting) {
      return;
    }

    this.submitDeletionRequest();
  }

  private submitDeletionRequest(): void {
    if (!this.eventId || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.eventService.requestDeletion(this.eventId).pipe(
      finalize(() => {
        this.isDeleting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.successMessage = 'Deletion request submitted. A manager must review it before event removal.';
        setTimeout(() => this.router.navigate(['/content-creator/events']), 1200);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to submit deletion request';
      }
    });
  }

  onImageUrlChange(value: string): void {
    this.isImagePreviewBroken = false;
    this.form.patchValue({ imageUrl: value.trim() }, { emitEvent: false });
  }

  get imagePreviewUrl(): string {
    return (this.form.get('imageUrl')?.value ?? '').trim();
  }

  onImageDrop(event: DragEvent): void {
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
    event.preventDefault();
    this.isImageDropActive = true;
  }

  onImageDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isImageDropActive = false;
  }

  onImagePreviewError(): void {
    this.isImagePreviewBroken = true;
  }

  clearImage(): void {
    this.form.patchValue({ imageUrl: '' });
    this.isImagePreviewBroken = false;
    this.isImageDropActive = false;
    this.cdr.detectChanges();
  }

  /**
   * Combines a date string (YYYY-MM-DD) and time string (HH:mm) into an ISO 8601 UTC datetime.
   * Example: "2026-04-16" + "18:30" → "2026-04-16T18:30:00Z"
   */
  private combineDateAndTime(dateStr: string | null, timeStr: string | null): string {
    if (!dateStr) {
      return new Date().toISOString();
    }

    const time = timeStr || '00:00';
    const combined = `${dateStr}T${time}:00`;
    
    // Parse as local time, then convert to UTC ISO string
    const date = new Date(combined);
    
    // Return ISO string with Z suffix to indicate UTC
    return date.toISOString();
  }

  toggleActivity(activityId: number): void {
    if (this.selectedActivityIds.has(activityId)) {
      this.selectedActivityIds.delete(activityId);
      return;
    }

    this.selectedActivityIds.add(activityId);
  }

  addTag(): void {
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
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  private parseRequiredNumber(value: string | null | undefined): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private parseOptionalNumber(value: string | null | undefined): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private formatDateForInput(date: string | Date | undefined): string {
    if (!date) {
      return '';
    }

    const parsed = new Date(date);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
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