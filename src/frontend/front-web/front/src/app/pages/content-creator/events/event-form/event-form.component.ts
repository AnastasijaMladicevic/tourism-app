import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { DestinationService } from '../../../../services/destination.service';
import { EventService } from '../../../../services/event.service';
import { CreateEventDto, EventDto, UpdateEventDto } from '../../../../models/event.model';

interface VenueOption {
  id: number;
  name: string;
  address: string;
  destinationId: number;
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
  private readonly destinationService = inject(DestinationService);
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
  eventStatus = '';
  organizerName = 'Current Content Creator';
  venueSearchTerm = 'Grand Horizon Resort';
  selectedActivityIds = new Set<number>([2]);

  private readonly fallbackEventTypes = [
    { id: 1, name: 'Festival' },
    { id: 2, name: 'Workshop' },
    { id: 3, name: 'Sports' },
    { id: 4, name: 'Cultural' },
    { id: 5, name: 'Exhibition' },
    { id: 6, name: 'Concert' }
  ];

  private readonly fallbackDestinations = [
    { id: 1, name: 'Belgrade' },
    { id: 2, name: 'Novi Sad' },
    { id: 3, name: 'Kopaonik' },
    { id: 4, name: 'Nis' }
  ];

  private readonly fallbackVenueOptions: VenueOption[] = [
    { id: 1, name: 'Grand Horizon Resort', address: 'Azure Coast Drive 15, Belgrade, Serbia', destinationId: 1 },
    { id: 2, name: 'Sunset Pavilion', address: 'Riverside Promenade 8, Novi Sad, Serbia', destinationId: 2 },
    { id: 3, name: 'City Museum Courtyard', address: 'Old Town Square 3, Nis, Serbia', destinationId: 4 }
  ];

  eventTypes = [...this.fallbackEventTypes];
  destinations = [...this.fallbackDestinations];
  venueOptions: VenueOption[] = [...this.fallbackVenueOptions];

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

  get selectedDestinationId(): number | undefined {
    return this.parseOptionalNumber(this.form.get('destinationId')?.value);
  }

  get filteredVenueOptions(): VenueOption[] {
    const destinationId = this.selectedDestinationId;
    if (!destinationId) {
      return this.venueOptions;
    }

    return this.venueOptions.filter((venue) => venue.destinationId === destinationId);
  }

  get selectedVenue(): VenueOption {
    if (this.filteredVenueOptions.length === 0) {
      return {
        id: 0,
        name: 'No venue available',
        address: 'No address available',
        destinationId: 0
      };
    }

    const term = this.venueSearchTerm.trim().toLowerCase();
    return this.filteredVenueOptions.find((venue) => venue.name.toLowerCase().includes(term)) ?? this.filteredVenueOptions[0];
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.organizerName = `${user.firstName} ${user.lastName}`.trim();
    }

    this.loadDropdownOptions();
    this.setupDestinationObjectSync();

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.eventId = Number(params['id']);
        this.loadEvent();
      }
    });
  }

  private loadDropdownOptions(): void {
    forkJoin({
      eventTypes: this.eventService.getEventTypes().pipe(
        catchError(() => of(this.fallbackEventTypes))
      ),
      destinations: this.destinationService
      .getAll({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
      .pipe(
        map((response: any) => {
          const list = Array.isArray(response) 
            ? response 
            : (response?.items ?? []);
          return list.map((d: any) => ({ id: d.id, name: d.name }));
        }),
        catchError(() => of(this.fallbackDestinations))
      ),
      venues: this.eventService.getObjectOptions({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' }).pipe(
        map((response) => response.items.map((item) => ({
          id: item.id,
          name: item.name,
          address: item.address ?? 'No address available',
          destinationId: item.destinationId
        }))),
        catchError(() => of(this.fallbackVenueOptions))
      )
    }).subscribe(({ eventTypes, destinations, venues }) => {
      this.eventTypes = eventTypes.length > 0 ? eventTypes : [...this.fallbackEventTypes];
      this.destinations = destinations.length > 0 ? destinations : [...this.fallbackDestinations];
      this.venueOptions = venues.length > 0 ? venues : [...this.fallbackVenueOptions];

      this.syncObjectSelectionWithDestination();

      this.cdr.detectChanges();
    });
  }

  private setupDestinationObjectSync(): void {
    this.form.get('destinationId')?.valueChanges.subscribe(() => {
      this.syncObjectSelectionWithDestination();
      this.cdr.detectChanges();
    });

    this.form.get('objectId')?.valueChanges.subscribe((value) => {
      const objectId = this.parseOptionalNumber(value);
      if (!objectId) {
        return;
      }

      const selected = this.filteredVenueOptions.find((venue) => venue.id === objectId);
      if (selected) {
        this.venueSearchTerm = selected.name;
      }
    });
  }

  private syncObjectSelectionWithDestination(): void {
    this.updateObjectControlState();

    const selectedObjectId = this.parseOptionalNumber(this.form.get('objectId')?.value);

    if (selectedObjectId && !this.filteredVenueOptions.some((venue) => venue.id === selectedObjectId)) {
      this.form.patchValue({ objectId: '' }, { emitEvent: false });
    }

    const activeObjectId = this.parseOptionalNumber(this.form.get('objectId')?.value);
    if (activeObjectId) {
      const selected = this.filteredVenueOptions.find((venue) => venue.id === activeObjectId);
      if (selected) {
        this.venueSearchTerm = selected.name;
        return;
      }
    }

    this.venueSearchTerm = this.filteredVenueOptions[0]?.name ?? '';
  }

  private updateObjectControlState(): void {
    const objectControl = this.form.get('objectId');
    if (!objectControl) {
      return;
    }

    const shouldDisable = !!this.selectedDestinationId && this.filteredVenueOptions.length === 0;

    if (shouldDisable && objectControl.enabled) {
      objectControl.disable({ emitEvent: false });
      return;
    }

    if (!shouldDisable && objectControl.disabled) {
      objectControl.enable({ emitEvent: false });
    }
  }

  loadEvent(): void {
    if (!this.eventId) {
      return;
    }

    this.isLoading = true;
    this.eventService.getMyById(this.eventId).subscribe({
      next: (event: EventDto) => {
        this.populateForm(event);
        this.eventStatus = event.status ?? '';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Event not found or you do not have permission to edit it.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  populateForm(event: EventDto): void {
    this.eventStatus = event.status ?? '';
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
      destinationId: event.destinationId?.toString() || '',
      objectId: event.objectId?.toString() || '',
      imageUrl: event.mainImageUrl ?? '',
      ageRestriction: '',
      tagsInput: ''
    });

    this.syncObjectSelectionWithDestination();
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
      imageUrl: this.getPersistentImageUrl(formValue.imageUrl)
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

    if (this.isApprovedEvent) {
      this.submitDeletionRequest();
      return;
    }

    this.submitDirectDeletion();
  }

  get isApprovedEvent(): boolean {
    return this.eventStatus.toLowerCase() === 'approved';
  }

  get deleteButtonLabel(): string {
    return this.isApprovedEvent ? 'Request Deletion' : 'Delete Event';
  }

  get deleteModalTitle(): string {
    return this.isApprovedEvent ? 'Request deletion' : 'Confirm deletion';
  }

  get deleteModalDescription(): string {
    return this.isApprovedEvent
      ? 'This event is approved, so removal requires a manager deletion request.'
      : 'This event is still pending, so it can be removed immediately.';
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

  private submitDirectDeletion(): void {
    if (!this.eventId || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.eventService.delete(this.eventId).pipe(
      finalize(() => {
        this.isDeleting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.successMessage = 'Event deleted successfully.';
        setTimeout(() => this.router.navigate(['/content-creator/events']), 1200);
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Failed to delete event';
      }
    });
  }

  onImageUrlChange(value: string): void {
    this.isImagePreviewBroken = false;
    this.form.patchValue({ imageUrl: value.trim() }, { emitEvent: false });
  }

  get imagePreviewUrl(): string {
    return this.normalizeImageUrl(this.form.get('imageUrl')?.value ?? '');
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
      return '';
    }

    const parsed = new Date(date);
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private normalizeImageUrl(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
      return '';
    }

    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
      return trimmed;
    }

    try {
      return encodeURI(new URL(trimmed, document.baseURI).href);
    } catch {
      return encodeURI(trimmed);
    }
  }

  private getPersistentImageUrl(value: string | null | undefined): string | undefined {
    const normalized = this.normalizeImageUrl(value ?? '');

    if (!normalized || normalized.startsWith('blob:') || normalized.startsWith('data:')) {
      return undefined;
    }
    return normalized;
  }

  private getDroppedImageUrl(event: DragEvent): string {
    const transfer = event.dataTransfer;
    if (!transfer) {
      return '';
    }

    const files = transfer.files;
    if (files && files.length > 0) {
      return '';
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