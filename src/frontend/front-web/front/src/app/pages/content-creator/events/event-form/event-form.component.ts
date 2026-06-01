import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, finalize, map, switchMap, tap, toArray } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../services/auth.service';
import { DestinationDto, DestinationService } from '../../../../services/destination.service';
import { RegionDto, RegionService } from '../../../../services/region';
import { EventImageDto, EventService } from '../../../../services/event.service';
import { ActivitiesService } from '../../../../services/activities';
import { CreateEventDto, EventDto, UpdateEventDto } from '../../../../models/event.model';
import { MapComponent } from '../../../../shared/components/map/map';
import { TranslationService } from '../../../../services/translation.service';

interface VenueOption {
  id: number;
  name: string;
  address: string;
  destinationId: number;
  latitude?: number;
  longitude?: number;
}

interface RelatedActivity {
  id: number;
  name: string;
  meta: string;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapComponent],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css', '../../../admin/shared/admin-page-title.css']
})
export class EventFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destinationService = inject(DestinationService);
  private readonly regionService = inject(RegionService);
  private readonly eventService = inject(EventService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
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
  galleryErrorMessage = '';
  successMessage = '';
  isSubmitting = false;
  isDeleting = false;
  showDeleteModal = false;
  isImageDropActive = false;

  imageUrls: string[] = [];
  imagesSnapshot: EventImageDto[] = [];
  eventStatus = '';
  organizerName = 'Current Content Creator';
  selectedActivityIds = new Set<number>();
  isLoadingRelatedActivities = false;
  showAllRelatedActivities = false;
  activitySearchTerm = '';
  showTipsModal = false;
  private loadedEvent: EventDto | null = null;
  private deletionRequestSubmitted = false;
  private readonly maxImageCount = 8;
  private readonly pendingImageFiles = new Map<string, File>();

  get ticketPriceLabel(): string {
    return this.translationService.translate('event.ticketPrice');
  }

  private readonly fallbackEventTypes = [
    { id: 1, name: 'Festival' },
    { id: 2, name: 'Workshop' },
    { id: 3, name: 'Sports' },
    { id: 4, name: 'Cultural' },
    { id: 5, name: 'Exhibition' },
    { id: 6, name: 'Concert' }
  ];

  private readonly fallbackDestinations: DestinationDto[] = [
    { id: 1, name: 'Belgrade', isActive: true, destinationTypeId: 0, destinationTypeName: '', latitude: 44.8176, longitude: 20.4633 },
    { id: 2, name: 'Novi Sad', isActive: true, destinationTypeId: 0, destinationTypeName: '', latitude: 45.2671, longitude: 19.8335 },
    { id: 3, name: 'Kopaonik', isActive: true, destinationTypeId: 0, destinationTypeName: '', latitude: 43.2853, longitude: 20.8080 },
    { id: 4, name: 'Nis', isActive: true, destinationTypeId: 0, destinationTypeName: '', latitude: 43.3209, longitude: 21.8958 }
  ];

  private readonly fallbackVenueOptions: VenueOption[] = [
    { id: 1, name: 'Grand Horizon Resort', address: 'Azure Coast Drive 15, Belgrade, Serbia', destinationId: 1, latitude: 44.8176, longitude: 20.4633 },
    { id: 2, name: 'Sunset Pavilion', address: 'Riverside Promenade 8, Novi Sad, Serbia', destinationId: 2, latitude: 45.2671, longitude: 19.8335 },
    { id: 3, name: 'City Museum Courtyard', address: 'Old Town Square 3, Nis, Serbia', destinationId: 4, latitude: 43.3209, longitude: 21.8958 }
  ];

  eventTypes = [...this.fallbackEventTypes];
  regions: RegionDto[] = [];
  destinations: DestinationDto[] = [...this.fallbackDestinations];
  venueOptions: VenueOption[] = [...this.fallbackVenueOptions];
  selectedRegionId: number | null = null;

  relatedActivities: RelatedActivity[] = [];

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

  get selectedDestinationId(): number | null {
    return this.toNumber(this.form.controls.destinationId.value);
  }

  onRegionChange(regionId: number | null): void {
    this.selectedRegionId = regionId;
    this.form.patchValue({ destinationId: '', objectId: '' }, { emitEvent: false });
    this.applyLocationFromSelection();
    this.loadDestinationsForRegion(regionId);
  }

  private loadDestinationsForRegion(regionId: number | null): void {
    this.destinationService.getAll(
      {
        page: 1,
        pageSize: 200,
        sortBy: 'name',
        sortOrder: 'asc',
        ...(regionId != null ? { regionId } : {})
      },
      { bypassRegion: true }
    ).pipe(
      map((response: any) => Array.isArray(response) ? response : (response?.items ?? [])),
      catchError(() => of([] as DestinationDto[]))
    ).subscribe((destinations) => {
      this.destinations = destinations.length > 0 ? destinations : [...this.fallbackDestinations];
      this.cdr.detectChanges();
    });
  }

  get minEndDate(): string {
    return this.form.controls.startDate.value || '';
  }

  get endDateBeforeStart(): boolean {
    const startDate = this.form.controls.startDate.value;
    const endDate = this.form.controls.endDate.value;
    if (!startDate || !endDate) {
      return false;
    }
    const startTime = this.form.controls.startTime.value || '00:00';
    const endTime = this.form.controls.endTime.value || '00:00';
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    return end <= start;
  }

  get filteredVenueOptions(): VenueOption[] {
    const destinationId = this.selectedDestinationId;
    if (!destinationId) {
      return this.venueOptions;
    }

    return this.venueOptions.filter((venue) => venue.destinationId === destinationId);
  }

  get selectedVenue(): VenueOption | null {
    const selectedObjectId = this.parseOptionalNumber(this.form.get('objectId')?.value);
    if (!selectedObjectId) {
      return null;
    }

    const venue = this.venueOptions.find((venueOption) => venueOption.id === selectedObjectId);
    if (venue) {
      return venue;
    }

    if (this.loadedEvent?.objectId === selectedObjectId) {
      return {
        id: selectedObjectId,
        name: this.loadedEvent.objectName?.trim() || 'Linked object',
        address: [
          this.loadedEvent.localityName?.trim(),
          this.loadedEvent.destinationName?.trim()
        ].filter((value): value is string => !!value).join(', ') || 'No address available',
        destinationId: this.loadedEvent.destinationId ?? 0,
        latitude: this.loadedEvent.latitude ?? undefined,
        longitude: this.loadedEvent.longitude ?? undefined
      };
    }

    return null;
  }

  get selectedDestination(): DestinationDto | null {
    const destinationId = this.selectedDestinationId;
    if (!destinationId) {
      return null;
    }

    return this.destinations.find((destination) => destination.id === destinationId) ?? null;
  }

  get linkedLocationTitle(): string {
    return this.selectedVenue?.name || 'No linked object selected';
  }

  get linkedLocationDescription(): string {
    if (this.selectedVenue?.address?.trim()) {
      return this.selectedVenue.address.trim();
    }

    if (this.selectedDestination?.name?.trim()) {
      return `Using destination coordinates for ${this.selectedDestination.name.trim()}.`;
    }

    return 'Select a destination and, optionally, an object to preview the right-side map.';
  }

  get visibleRelatedActivities(): RelatedActivity[] {
    const query = this.activitySearchTerm.trim().toLowerCase();
    const filtered = query
      ? this.relatedActivities.filter((activity) => activity.name.toLowerCase().includes(query))
      : this.relatedActivities;

    return this.showAllRelatedActivities ? filtered : filtered.slice(0, 4);
  }

  get hiddenActivitiesCount(): number {
    return Math.max(0, this.relatedActivities.length - 4);
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.organizerName = `${user.firstName} ${user.lastName}`.trim();
    }

    this.loadDropdownOptions();
    this.loadRelatedActivities();
    this.setupDestinationObjectSync();

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.eventId = Number(params['id']);
        this.loadEvent();
      }
    });
  }

  ngOnDestroy(): void {
    this.releasePendingImagePreviews();
  }

  private loadDropdownOptions(): void {
    forkJoin({
      eventTypes: this.eventService.getEventTypes().pipe(
        catchError(() => of(this.fallbackEventTypes))
      ),
      regions: this.regionService.getAll().pipe(catchError(() => of([]))),
      destinations: this.destinationService
        .getAll({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
        .pipe(
          map((response: any) => {
            const list = Array.isArray(response)
              ? response
              : (response?.items ?? []);
            return list.map((d: any) => ({
              id: d.id,
              name: d.name,
              isActive: d.isActive ?? true,
              destinationTypeId: d.destinationTypeId ?? 0,
              destinationTypeName: d.destinationTypeName ?? '',
              latitude: d.latitude,
              longitude: d.longitude
            } as DestinationDto));
          }),
          catchError(() => of(this.fallbackDestinations))
        ),
      venues: this.eventService.getObjectOptions({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' }).pipe(
        map((response) => response.items.map((item) => ({
          id: item.id,
          name: item.name,
          address: item.address ?? 'No address available',
          destinationId: item.destinationId,
          latitude: (item as unknown as { latitude?: number }).latitude,
          longitude: (item as unknown as { longitude?: number }).longitude
        }))),
        catchError(() => of(this.fallbackVenueOptions))
      )
    }).subscribe(({ eventTypes, regions, destinations, venues }) => {
      this.eventTypes = eventTypes.length > 0 ? eventTypes : [...this.fallbackEventTypes];
      this.regions = regions;
      this.destinations = destinations.length > 0 ? destinations : [...this.fallbackDestinations];
      this.venueOptions = venues.length > 0 ? venues : [...this.fallbackVenueOptions];

      // Sync any existing selection with new data
      this.syncObjectSelectionWithDestination();
      this.applyLocationFromSelection();
      this.cdr.detectChanges();
    });
  }

  private loadRelatedActivities(): void {
    this.isLoadingRelatedActivities = true;

    this.activitiesService.getMyActivities({
      page: 1,
      pageSize: 200,
      sortBy: 'name',
      sortOrder: 'asc'
    }).pipe(
      map((response) => response.items.map((activity) => ({
        id: activity.id,
        name: activity.name,
        meta: this.buildActivityMeta(activity)
      }))),
      catchError(() => of([] as RelatedActivity[])),
      finalize(() => {
        this.isLoadingRelatedActivities = false;
      })
    ).subscribe((activities) => {
      this.relatedActivities = activities;
      this.cdr.detectChanges();
    });
  }

  private buildActivityMeta(activity: { durationMinutes?: number; price?: number }): string {
    const activityLabel = this.translationService.translate('activity.label');
    const duration = activity.durationMinutes
      ? `${activity.durationMinutes} mins`
      : this.translationService.translate('common.notAvailable');
    const price = activity.price != null
      ? `$${Number(activity.price).toFixed(0)}`
      : this.translationService.translate('common.notAvailable');
    return `${activityLabel} · ${duration} · ${price}`;
  }

  private setupDestinationObjectSync(): void {
    this.form.controls.destinationId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncObjectSelectionWithDestination();
        this.applyLocationFromSelection();
        this.cdr.detectChanges();
      });

    this.form.controls.objectId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyLocationFromSelection();
        this.cdr.detectChanges();
      });
  }

  private syncObjectSelectionWithDestination(): void {
    this.updateObjectControlState();

    const selectedObjectId = this.toNumber(this.form.controls.objectId.value);

    if (selectedObjectId && !this.filteredVenueOptions.some((venue) => venue.id === selectedObjectId)) {
      this.form.patchValue({ objectId: '' }, { emitEvent: false });
    }
  }

  private applyLocationFromSelection(): void {
    const selectedObjectId = this.toNumber(this.form.controls.objectId.value);
    const selectedDestinationId = this.toNumber(this.form.controls.destinationId.value);

    // First priority: use venue coordinates if a venue object is selected
    if (selectedObjectId) {
      const selectedVenue = this.venueOptions.find((venue) => venue.id === selectedObjectId);
      const venueLat = this.toNumber(selectedVenue?.latitude);
      const venueLng = this.toNumber(selectedVenue?.longitude);

      if (venueLat != null && venueLng != null) {
        this.setLocationFromSelection(venueLat, venueLng);
        return;
      }
    }

    // Second priority: use destination coordinates if a destination is selected
    if (selectedDestinationId) {
      const selectedDestination = this.destinations.find(
        (destination) => destination.id === selectedDestinationId
      );
      const destinationLat = this.toNumber(selectedDestination?.latitude);
      const destinationLng = this.toNumber(selectedDestination?.longitude);

      if (destinationLat != null && destinationLng != null) {
        this.setLocationFromSelection(destinationLat, destinationLng);
      }
    }
  }

  private setLocationFromSelection(latitude: number, longitude: number): void {
    const latValue = latitude.toFixed(6);
    const lngValue = longitude.toFixed(6);

    this.form.patchValue({
      latitude: latValue,
      longitude: lngValue
    }, { emitEvent: false });

    this.cdr.detectChanges();
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
    forkJoin({
      event: this.eventService.getMyById(this.eventId),
      images: this.eventService.getImages(this.eventId).pipe(catchError(() => of([] as EventImageDto[])))
    }).subscribe({
      next: ({ event, images }) => {
        this.populateForm(event, images);
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

  populateForm(event: EventDto, images: EventImageDto[] = []): void {
    this.loadedEvent = event;
    this.deletionRequestSubmitted = !!event.hasPendingDeletionRequest;
    this.eventStatus = event.status ?? '';
    this.imagesSnapshot = images.map((i) => ({ ...i }));
    this.imageUrls = this.buildOrderedImageUrls(event, images);

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
      ageRestriction: '',
      tagsInput: ''
    });

    // Pre-select region from the event's destination
    const destId = this.toNumber(event.destinationId);
    if (destId) {
      const dest = this.destinations.find((d) => d.id === destId);
      if (dest?.regionId != null) {
        this.selectedRegionId = dest.regionId;
        this.destinations = this.destinations.filter((d) => d.regionId === this.selectedRegionId);
      }
    }

    // Sync the selection and map display
    this.syncObjectSelectionWithDestination();
    this.applyLocationFromSelection();
    this.cdr.detectChanges();
  }

  private buildOrderedImageUrls(event: EventDto, images: EventImageDto[]): string[] {
    if (images.length > 0) {
      const sorted = [...images].sort((a, b) => {
        if (a.isMain === b.isMain) {
          return 0;
        }
        return a.isMain ? -1 : 1;
      });
      const urls = sorted.map((i) => i.url?.trim()).filter((u): u is string => !!u);
      const seen = new Set<string>();
      return urls.filter((u) => {
        if (seen.has(u)) {
          return false;
        }
        seen.add(u);
        return true;
      });
    }

    const main = event.mainImageUrl?.trim();
    if (main) {
      return [main];
    }
    return [];
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!selectedFiles.length) {
      return;
    }

    const remainingSlots = this.maxImageCount - this.imageUrls.length;
    if (remainingSlots <= 0) {
      this.galleryErrorMessage = `You can upload up to ${this.maxImageCount} images per event.`;
      input.value = '';
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, remainingSlots);
    const duplicateNames: string[] = [];
    const addedKeys = new Set<string>();

    for (const file of acceptedFiles) {
      const key = `${file.name}_${file.size}`;
      if (this.isPendingFileDuplicate(file) || addedKeys.has(key)) {
        duplicateNames.push(file.name);
        continue;
      }
      addedKeys.add(key);
      const previewUrl = URL.createObjectURL(file);
      this.pendingImageFiles.set(previewUrl, file);
      this.imageUrls.push(previewUrl);
    }

    if (duplicateNames.length > 0) {
      this.galleryErrorMessage = `Duplicate image(s) skipped: ${duplicateNames.join(', ')}`;
    } else if (acceptedFiles.length < selectedFiles.length) {
      this.galleryErrorMessage = `Only the first ${remainingSlots} images were added. Each event can have up to ${this.maxImageCount} images.`;
    } else {
      this.galleryErrorMessage = '';
    }

    input.value = '';
  }

  removeImage(index: number): void {
    if (index < 0 || index >= this.imageUrls.length) {
      return;
    }

    const [removedUrl] = this.imageUrls.splice(index, 1);
    this.revokePendingPreview(removedUrl);
  }

  setPrimaryImage(index: number): void {
    if (index <= 0 || index >= this.imageUrls.length) {
      return;
    }

    const [selected] = this.imageUrls.splice(index, 1);
    this.imageUrls.unshift(selected);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.imageUrls.length === 0) {
      this.galleryErrorMessage = 'At least one image is required before saving.';
      return;
    }

    if (this.endDateBeforeStart) {
      this.errorMessage = 'End date and time must be after start date and time.';
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
      objectId: this.parseOptionalNumber(formValue.objectId)
    };

    const request$ = this.isEditMode && this.eventId
      ? this.eventService.update(this.eventId, dto as UpdateEventDto)
      : this.eventService.create(dto as CreateEventDto);

    request$
      .pipe(
        switchMap((eventDto) => {
          if (this.isEditMode && this.eventId) {
            return this.syncImagesAfterSave(this.eventId, this.imageUrls, this.imagesSnapshot).pipe(map(() => eventDto));
          }
          return this.attachImagesAfterCreate(eventDto as EventDto);
        }),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
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

  private attachImagesAfterCreate(created: EventDto): Observable<EventDto> {
    if (this.imageUrls.length === 0) {
      return of(created);
    }

    return this.uploadPendingImages(created.id, this.imageUrls, 0).pipe(
      map(() => created),
      catchError((error) => {
        this.errorMessage = error?.error?.message ?? 'Event created but image upload failed. Please add images via Edit.';
        return of(created);
      })
    );
  }

  private syncImagesAfterSave(
    eventId: number,
    desiredOrdered: string[],
    snapshot: EventImageDto[]
  ): Observable<void> {
    const desired = desiredOrdered.map((u) => u.trim()).filter((u) => u.length > 0);
    const desiredExistingSet = new Set(desired.filter((url) => !this.pendingImageFiles.has(url)));

    const toDelete = snapshot.filter((img) => !desiredExistingSet.has(img.url.trim()));
    const surviving = snapshot.filter((img) => desiredExistingSet.has(img.url.trim()));

    const urlToId = new Map<string, number>();
    for (const img of surviving) {
      urlToId.set(img.url.trim(), img.id);
    }

    const delete$ =
      toDelete.length === 0
        ? of(undefined)
        : forkJoin(toDelete.map((d) => this.eventService.deleteImageById(d.id))).pipe(
          map(() => undefined),
          catchError(() => of(undefined))
        );

    return delete$.pipe(
      switchMap(() => this.uploadPendingImages(eventId, desired, surviving.length, urlToId)),
      switchMap((updatedMap) => this.ensureMainImage(desired, updatedMap))
    );
  }

  private ensureMainImage(desired: string[], urlToId: Map<string, number>): Observable<void> {
    if (desired.length === 0) {
      return of(undefined);
    }

    const mainId = urlToId.get(desired[0]);
    if (!mainId) {
      return of(undefined);
    }

    return this.eventService.setMainImage(mainId).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  saveDraft(): void {
    this.successMessage = 'Draft saved locally.';
  }

  cancel(): void {
    this.router.navigate(['/content-creator/events']);
  }

  openDeleteModal(): void {
    if (!this.isEditMode || !this.eventId || this.isSubmitting || this.isDeleting || this.hasPendingDeletionRequest) {
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
      if (this.hasPendingDeletionRequest) {
        this.showDeleteModal = false;
        return;
      }
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

  get hasPendingDeletionRequest(): boolean {
    if (this.deletionRequestSubmitted) {
      return true;
    }

    if (this.loadedEvent?.hasPendingDeletionRequest) {
      return true;
    }

    return this.eventStatus.toLowerCase().includes('deletion');
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
        this.deletionRequestSubmitted = true;
        if (this.loadedEvent) {
          this.loadedEvent.hasPendingDeletionRequest = true;
        }
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

  onGalleryDrop(event: DragEvent): void {
    event.preventDefault();
    this.isImageDropActive = false;

    const droppedFiles = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!droppedFiles.length) {
      return;
    }

    const remainingSlots = this.maxImageCount - this.imageUrls.length;
    if (remainingSlots <= 0) {
      this.galleryErrorMessage = `You can upload up to ${this.maxImageCount} images per event.`;
      return;
    }

    const acceptedFiles = droppedFiles.slice(0, remainingSlots);
    for (const file of acceptedFiles) {
      const previewUrl = URL.createObjectURL(file);
      this.pendingImageFiles.set(previewUrl, file);
      this.imageUrls.push(previewUrl);
    }

    this.errorMessage =
      acceptedFiles.length < droppedFiles.length
        ? `Only the first ${remainingSlots} images were added. Each event can have up to ${this.maxImageCount} images.`
        : '';
    this.cdr.detectChanges();
  }

  onGalleryDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isImageDropActive = true;
  }

  onGalleryDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isImageDropActive = false;
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

  toggleMoreActivities(): void {
    this.showAllRelatedActivities = !this.showAllRelatedActivities;
  }

  openTipsModal(): void {
    this.showTipsModal = true;
  }

  closeTipsModal(): void {
    this.showTipsModal = false;
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
    const parsed = this.toNumber(value);
    return parsed ?? 0;
  }

  private parseOptionalNumber(value: string | null | undefined): number | undefined {
    return this.toNumber(value) ?? undefined;
  }

  private uploadPendingImages(
    eventId: number,
    desiredOrdered: string[],
    existingCount: number,
    urlToId = new Map<string, number>()
  ): Observable<Map<string, number>> {
    const pendingEntries = desiredOrdered
      .filter((url) => this.pendingImageFiles.has(url))
      .map((previewUrl) => ({
        previewUrl,
        file: this.pendingImageFiles.get(previewUrl)!
      }));

    if (pendingEntries.length === 0) {
      return of(urlToId);
    }

    return from(pendingEntries).pipe(
      concatMap((entry, index) =>
        this.eventService.uploadImage(eventId, entry.file, existingCount === 0 && index === 0).pipe(
          tap((dto) => {
            urlToId.set(entry.previewUrl, dto.id);
          })
        )
      ),
      toArray(),
      map(() => urlToId)
    );
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

  private isPendingFileDuplicate(file: File): boolean {
    for (const existing of this.pendingImageFiles.values()) {
      if (existing.name === file.name && existing.size === file.size) {
        return true;
      }
    }
    return false;
  }

  private revokePendingPreview(previewUrl: string | undefined): void {
    if (!previewUrl || !this.pendingImageFiles.has(previewUrl)) {
      return;
    }

    this.pendingImageFiles.delete(previewUrl);
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private releasePendingImagePreviews(): void {
    for (const previewUrl of this.pendingImageFiles.keys()) {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }
    this.pendingImageFiles.clear();
  }
  toNumber(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
