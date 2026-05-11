import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { MapComponent } from '../../../../shared/components/map/map';
import {
  ActivitiesService,
  ActivityTypeOption,
  ActivityImageDto,
  CreateActivityDto,
  UpdateActivityDto,
  LocalityOption,
  ActivityDto
} from '../../../../services/activities';
import { DestinationService, DestinationDto } from '../../../../services/destination.service';
import { EventService } from '../../../../services/event.service';

interface ObjectOption {
  id: number;
  name: string;
  destinationId?: number;
  destinationName?: string;
  latitude?: number;
  longitude?: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  residential?: string;
  path?: string;
  neighbourhood?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
  display_name?: string;
}

interface DraftPayload {
  values: {
    name: string;
    description: string;
    activityTypeId: number | null;
    fallbackActivityTypeId: number | null;
    destinationId: number | null;
    localityId: number | null;
    objectId: number | null;
    price: number | null;
    durationMinutes: number | null;
    latitude: number | null;
    longitude: number | null;
    isVisible: boolean;
  };
  images: string[];
}

@Component({
  selector: 'app-activity-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapComponent],
  templateUrl: './activity-create.component.html',
  styleUrl: './activity-create.component.css'
})
export class ActivityCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  form = this.fb.group(
    {
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
      description: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
      activityTypeId: this.fb.control<number | null>(null, [Validators.min(1)]),
      fallbackActivityTypeId: this.fb.control<number | null>(null, [Validators.min(1)]),
      destinationId: this.fb.control<number | null>(null),
      localityId: this.fb.control<number | null>(null),
      objectId: this.fb.control<number | null>(null),
      price: this.fb.control<number | null>(null, [Validators.min(0)]),
      durationMinutes: this.fb.control<number | null>(null, [Validators.min(1)]),
      latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
      longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
      isVisible: this.fb.nonNullable.control(true)
    },
    {
      validators: [
        this.requireLocation,
        this.requireBothCoordinates,
        this.requireActivityType
      ]
    }
  );

  isSubmitting = false;
  isDeleting = false;
  showDeleteModal = false;
  isLoadingOptions = true;
  isLoadingActivity = false;
  isEditMode = false;
  activityId: number | null = null;
  errorMessage = '';
  successMessage = '';

  activityTypes: ActivityTypeOption[] = [];
  destinations: DestinationDto[] = [];
  localities: LocalityOption[] = [];
  objects: ObjectOption[] = [];
  private loadedActivity: ActivityDto | null = null;
  private deletionRequestSubmitted = false;

  private readonly draftKey = 'content-creator:add-activity-draft';
  private geocodeRequestId = 0;
  private forwardGeocodeRequestId = 0;

  locationDetails = {
    city: '-',
    street: '-',
    fullAddress: '-',
    loading: false
  };

  locationContextQuery = '';
  isLocationContextSearching = false;

  pendingImageUrl = '';
  imageUrls: string[] = [];

  /** Normalized URLs already persisted for this activity when the edit form loaded (skip on save). */
  private initialStoredImageUrlKeys = new Set<string>();
  /** True if GET /activities/:id/images returned at least one row — activity already has a main image in DB. */
  private hadStoredImagesWhenLoaded = false;

  ngOnInit(): void {
    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
      this.isEditMode = true;
      this.activityId = idFromRoute;
    }

    if (!this.isEditMode) {
      this.initialStoredImageUrlKeys.clear();
      this.hadStoredImagesWhenLoaded = false;
      this.loadDraft();
    }

    this.loadOptions();

    if (this.isEditMode) {
      this.loadActivity();
    }

    this.form.controls.destinationId.valueChanges.subscribe(() => {
      this.syncDependentSelections();
      this.applyLocationFromSelection();
    });

    this.form.controls.localityId.valueChanges.subscribe(() => {
      this.applyLocationFromSelection();
    });

    this.form.controls.objectId.valueChanges.subscribe(() => {
      this.applyLocationFromSelection();
    });
  }

  ngOnDestroy(): void { }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Activity' : 'Create Activity';
  }

  get isApprovedActivity(): boolean {
    return (this.loadedActivity?.status ?? '').toLowerCase() === 'approved';
  }

  get deleteModalTitle(): string {
    return this.isApprovedActivity ? 'Request deletion' : 'Confirm deletion';
  }

  get deleteModalDescription(): string {
    return this.isApprovedActivity
      ? 'This activity is approved, so removal requires a manager deletion request.'
      : 'This activity is still pending, so it can be removed immediately.';
  }

  get hasPendingDeletionRequest(): boolean {
    if (this.deletionRequestSubmitted) {
      return true;
    }

    if (this.loadedActivity?.hasPendingDeletionRequest) {
      return true;
    }

    const status = (this.loadedActivity?.status ?? '').toLowerCase();
    return status.includes('deletion');
  }

  openDeleteModal(): void {
    if (!this.isEditMode || !this.activityId || this.isSubmitting || this.isDeleting || this.hasPendingDeletionRequest) {
      return;
    }

    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  closeDeleteModal(): void {
    if (this.isDeleting) {
      return;
    }

    this.showDeleteModal = false;
  }

  get hasTypeOptions(): boolean {
    return this.activityTypes.length > 0;
  }

  get filteredLocalities(): LocalityOption[] {
    const destinationId = this.form.controls.destinationId.value;
    if (!destinationId) {
      return this.localities;
    }

    return this.localities.filter((locality) => locality.destinationId === destinationId);
  }

  get filteredObjects(): ObjectOption[] {
    const destinationId = this.form.controls.destinationId.value;
    if (!destinationId) {
      return this.objects;
    }

    return this.objects.filter((objectItem) => !objectItem.destinationId || objectItem.destinationId === destinationId);
  }

  addImageUrl(): void {
    const url = this.pendingImageUrl.trim();
    if (!url) {
      return;
    }

    if (!this.isValidHttpUrl(url)) {
      this.errorMessage = 'Please enter a valid image URL (http or https).';
      return;
    }

    if (this.imageUrls.includes(url)) {
      this.pendingImageUrl = '';
      return;
    }

    this.imageUrls.push(url);
    this.pendingImageUrl = '';
    this.errorMessage = '';
  }

  removeImage(index: number): void {
    if (index < 0 || index >= this.imageUrls.length) {
      return;
    }

    this.imageUrls.splice(index, 1);
  }

  setPrimaryImage(index: number): void {
    if (index <= 0 || index >= this.imageUrls.length) {
      return;
    }

    const [selected] = this.imageUrls.splice(index, 1);
    this.imageUrls.unshift(selected);
  }

  onLocationContextSearch(): void {
    const query = this.locationContextQuery.trim();
    if (!query || this.isLocationContextSearching) {
      return;
    }

    this.isLocationContextSearching = true;
    const requestId = ++this.forwardGeocodeRequestId;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1`;

    fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Location search failed'))))
      .then((results: { lat?: string; lon?: string }[]) => {
        this.ngZone.run(() => {
          if (requestId !== this.forwardGeocodeRequestId) {
            return;
          }

          this.isLocationContextSearching = false;
          const hit = Array.isArray(results) ? results[0] : undefined;
          if (!hit?.lat || !hit?.lon) {
            return;
          }

          const lat = Number(hit.lat);
          const lon = Number(hit.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
          }

          this.selectLocation(lat, lon);
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          if (requestId !== this.forwardGeocodeRequestId) {
            return;
          }

          this.isLocationContextSearching = false;
        });
      });
  }

  saveDraft(): void {
    if (this.isEditMode) {
      return;
    }

    const payload: DraftPayload = {
      values: this.form.getRawValue(),
      images: [...this.imageUrls]
    };

    localStorage.setItem(this.draftKey, JSON.stringify(payload));
    this.successMessage = 'Draft saved.';
    this.errorMessage = '';
  }

  cancel(): void {
    this.router.navigate(['/content-creator/activities']);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const values = this.form.getRawValue();
    const activityTypeId = values.activityTypeId ?? values.fallbackActivityTypeId;

    if (!activityTypeId) {
      this.isSubmitting = false;
      this.errorMessage = 'Activity type is required.';
      return;
    }

    const dto: CreateActivityDto | UpdateActivityDto = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      activityTypeId,
      destinationId: values.destinationId ?? undefined,
      localityId: values.localityId ?? undefined,
      objectId: values.objectId ?? undefined,
      price: values.price ?? undefined,
      durationMinutes: values.durationMinutes ?? undefined,
      latitude: values.latitude ?? undefined,
      longitude: values.longitude ?? undefined
    };

    const request = this.isEditMode && this.activityId
      ? this.activitiesService.update(this.activityId, dto as UpdateActivityDto)
      : this.activitiesService.create(dto as CreateActivityDto);

    request
      .pipe(
        switchMap((createdActivity) => this.attachImagesAfterCreate(createdActivity)),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: ({ imageUploadFailed }) => {
          localStorage.removeItem(this.draftKey);
          this.successMessage = imageUploadFailed
            ? `Activity ${this.isEditMode ? 'updated' : 'created'}, but some images could not be attached.`
            : `Activity ${this.isEditMode ? 'updated' : 'created'} successfully.`;

          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 900);

          this.errorMessage = '';
        },
        error: (error: unknown) => {
          const message = this.extractErrorMessage(error) ?? `Failed to ${this.isEditMode ? 'update' : 'create'} activity.`;
          this.errorMessage = message;
          this.successMessage = '';
        }
      });
  }

  deleteActivity(): void {
    if (!this.isEditMode || !this.activityId || this.isSubmitting || this.isDeleting) {
      return;
    }

    if (this.isApprovedActivity) {
      if (this.hasPendingDeletionRequest) {
        this.showDeleteModal = false;
        return;
      }
      this.submitActivityDeletionRequest();
      return;
    }

    this.submitActivityDirectDeletion();
  }

  private submitActivityDeletionRequest(): void {
    if (!this.activityId || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.activitiesService
      .requestDeletion(this.activityId)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.deletionRequestSubmitted = true;
          if (this.loadedActivity) {
            this.loadedActivity.hasPendingDeletionRequest = true;
          }
          this.showDeleteModal = false;
          this.successMessage = 'Deletion request submitted. A manager must review it before activity removal.';
          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 1200);
        },
        error: (error: unknown) => {
          this.errorMessage = this.extractErrorMessage(error) ?? 'Failed to submit deletion request';
        }
      });
  }

  private submitActivityDirectDeletion(): void {
    if (!this.activityId || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.activitiesService
      .delete(this.activityId)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.showDeleteModal = false;
          this.successMessage = 'Activity deleted successfully.';
          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 700);
        },
        error: (error: unknown) => {
          this.errorMessage = this.extractErrorMessage(error) ?? 'Failed to delete activity.';
        }
      });
  }

  private loadOptions(): void {
    this.isLoadingOptions = true;

    forkJoin({
      activityTypes: this.activitiesService.getActivityTypeOptions().pipe(catchError(() => of([]))),
      destinations: this.destinationService.getAll({
        page: 1,
        pageSize: 300,
        sortBy: 'name',
        sortOrder: 'asc'
      }).pipe(
        map((response: DestinationDto[] | { items?: DestinationDto[] }) => {
          return Array.isArray(response) ? response : (response.items ?? []);
        }),
        catchError(() => of([]))
      ),
      localities: this.activitiesService.getLocalityOptions().pipe(catchError(() => of([]))),
      objects: this.eventService.getObjectOptions({
        page: 1,
        pageSize: 400,
        sortBy: 'name',
        sortOrder: 'asc'
      }).pipe(
        map((response) => response.items.map((item) => ({
          id: item.id,
          name: item.name,
          destinationId: item.destinationId,
          destinationName: item.destinationName,
          latitude: (item as unknown as { latitude?: number }).latitude,
          longitude: (item as unknown as { longitude?: number }).longitude
        }))),
        catchError(() => of([]))
      )
    }).subscribe(({ activityTypes, destinations, localities, objects }) => {
      this.activityTypes = activityTypes;
      this.destinations = destinations;
      this.localities = localities;
      this.objects = objects;
      this.syncEditModeOptions();
      this.syncDependentSelections();
      this.applyLocationFromSelection();
      this.isLoadingOptions = false;
    });
  }

  private applyLocationFromSelection(): void {
    const selectedObjectId = this.form.controls.objectId.value;
    const selectedLocalityId = this.form.controls.localityId.value;
    const selectedDestinationId = this.form.controls.destinationId.value;

    const selectedObject = selectedObjectId
      ? this.objects.find((objectItem) => objectItem.id === selectedObjectId)
      : undefined;

    const objectLat = this.toNumber(selectedObject?.latitude);
    const objectLng = this.toNumber(selectedObject?.longitude);
    if (objectLat != null && objectLng != null) {
      this.setLocationFromSelection(objectLat, objectLng);
      return;
    }

    const selectedLocality = selectedLocalityId
      ? this.localities.find((locality) => locality.id === selectedLocalityId)
      : undefined;
    const localityLat = this.toNumber((selectedLocality as unknown as { latitude?: number })?.latitude);
    const localityLng = this.toNumber((selectedLocality as unknown as { longitude?: number })?.longitude);
    if (localityLat != null && localityLng != null) {
      this.setLocationFromSelection(localityLat, localityLng);
      return;
    }

    const selectedDestination = selectedDestinationId
      ? this.destinations.find((destination) => destination.id === selectedDestinationId)
      : undefined;
    const destinationLat = this.toNumber(selectedDestination?.latitude);
    const destinationLng = this.toNumber(selectedDestination?.longitude);
    if (destinationLat != null && destinationLng != null) {
      this.setLocationFromSelection(destinationLat, destinationLng);
      return;
    }

    // No coordinates available in selected destination/locality/object:
    // still show meaningful location details in the side panel.
    const fallback = this.buildSelectionLocationDetails();
    this.locationDetails = {
      ...fallback,
      loading: false
    };
  }

  private setLocationFromSelection(latitude: number, longitude: number): void {
    this.form.patchValue(
      {
        latitude,
        longitude
      },
      { emitEvent: false }
    );

    this.reverseGeocode(latitude, longitude);
  }

  private attachImagesAfterCreate(createdActivity: ActivityDto) {
    const trimmedGallery = this.imageUrls.map((u) => u.trim()).filter((u) => u.length > 0);

    let urlsToAttach: string[];
    if (this.isEditMode) {
      urlsToAttach = trimmedGallery.filter((url) => !this.initialStoredImageUrlKeys.has(this.normalizeImageUrlKey(url)));
    } else {
      urlsToAttach = trimmedGallery;
    }

    if (urlsToAttach.length === 0) {
      return of({ createdActivity, imageUploadFailed: false });
    }

    const treatAsAppend = this.isEditMode && this.hadStoredImagesWhenLoaded;

    return this.activitiesService
      .attachImages(createdActivity.id, urlsToAttach, { treatAsAppend })
      .pipe(
        map(() => ({ createdActivity, imageUploadFailed: false })),
        catchError(() => of({ createdActivity, imageUploadFailed: true }))
      );
  }

  private loadActivity(): void {
    if (!this.activityId) {
      return;
    }

    this.isLoadingActivity = true;
    this.errorMessage = '';

    this.activitiesService.getById(this.activityId)
      .pipe(finalize(() => {
        this.isLoadingActivity = false;
      }))
      .subscribe({
        next: (activity) => {
          this.loadedActivity = activity;
          this.deletionRequestSubmitted = !!activity.hasPendingDeletionRequest;
          this.form.patchValue({
            name: activity.name,
            description: activity.description ?? '',
            activityTypeId: activity.activityTypeId,
            fallbackActivityTypeId: activity.activityTypeId,
            destinationId: activity.destinationId ?? null,
            localityId: activity.localityId ?? null,
            objectId: activity.objectId ?? null,
            price: activity.price ?? null,
            durationMinutes: activity.durationMinutes ?? null,
            latitude: activity.latitude ?? null,
            longitude: activity.longitude ?? null,
            isVisible: activity.isActive
          });

          this.syncEditModeOptions();

          this.loadActivityImages(activity.id);
          this.cdr.detectChanges();

        },
        error: (error: unknown) => {
          this.errorMessage = this.extractErrorMessage(error) ?? 'Failed to load activity for editing.';
        }
      });
  }

  private syncDependentSelections(): void {
    const selectedDestinationId = this.form.controls.destinationId.value;
    const selectedLocalityId = this.form.controls.localityId.value;
    const selectedObjectId = this.form.controls.objectId.value;

    if (selectedDestinationId && selectedLocalityId) {
      const localityMatches = this.localities.some((locality) => {
        return locality.id === selectedLocalityId && locality.destinationId === selectedDestinationId;
      });

      if (!localityMatches) {
        this.form.controls.localityId.setValue(null, { emitEvent: false });
      }
    }

    if (selectedDestinationId && selectedObjectId) {
      const objectMatches = this.objects.some((item) => {
        return item.id === selectedObjectId && (!item.destinationId || item.destinationId === selectedDestinationId);
      });

      if (!objectMatches) {
        this.form.controls.objectId.setValue(null, { emitEvent: false });
      }
    }
  }

  private loadDraft(): void {
    const raw = localStorage.getItem(this.draftKey);
    if (!raw) {
      return;
    }

    try {
      const draft = JSON.parse(raw) as DraftPayload;

      if (draft.values) {
        this.form.patchValue(draft.values);
      }

      if (Array.isArray(draft.images)) {
        this.imageUrls = draft.images.filter((url) => typeof url === 'string' && url.length > 0);
      }
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }

  private loadActivityImages(activityId: number): void {
    this.activitiesService.getImages(activityId)
      .pipe(catchError(() => of([] as ActivityImageDto[])))
      .subscribe((images) => {
        this.initialStoredImageUrlKeys.clear();
        this.hadStoredImagesWhenLoaded = images.length > 0;

        for (const image of images) {
          const key = this.normalizeImageUrlKey(image.url);
          if (key) {
            this.initialStoredImageUrlKeys.add(key);
          }
        }

        const orderedUrls = images
          .slice()
          .sort((first, second) => Number(second.isMain) - Number(first.isMain) || first.id - second.id)
          .map((image) => image.url)
          .filter((url) => typeof url === 'string' && url.length > 0);

        if (orderedUrls.length > 0) {
          this.imageUrls = Array.from(new Set(orderedUrls));
        } else {
          const fallbackMain = this.loadedActivity?.mainImageUrl?.trim();
          this.imageUrls = fallbackMain ? [fallbackMain] : [];
          if (fallbackMain) {
            this.initialStoredImageUrlKeys.add(this.normalizeImageUrlKey(fallbackMain));
          }
        }

        this.cdr.detectChanges();
      });
  }

  private normalizeImageUrlKey(url: string): string {
    return url.trim().toLowerCase();
  }

  private syncEditModeOptions(): void {
    if (!this.loadedActivity) {
      return;
    }

    const activity = this.loadedActivity;

    if (activity.destinationId && activity.destinationName) {
      const hasDestination = this.destinations.some((destination) => destination.id === activity.destinationId);
      if (!hasDestination) {
        this.destinations = [
          {
            id: activity.destinationId,
            name: activity.destinationName,
            description: activity.destinationName,
            isActive: true,
            destinationTypeId: 0,
            destinationTypeName: '',
            regionId: activity.regionId,
            regionName: activity.regionName,
            regionCode: activity.regionCode
          },
          ...this.destinations
        ];
      }
    }

    if (activity.localityId && activity.localityName) {
      const hasLocality = this.localities.some((locality) => locality.id === activity.localityId);
      if (!hasLocality) {
        this.localities = [
          {
            id: activity.localityId,
            name: activity.localityName,
            destinationId: activity.destinationId ?? 0,
            destinationName: activity.destinationName ?? ''
          },
          ...this.localities
        ];
      }
    }

    if (activity.objectId && activity.objectName) {
      const hasObject = this.objects.some((objectItem) => objectItem.id === activity.objectId);
      if (!hasObject) {
        this.objects = [
          {
            id: activity.objectId,
            name: activity.objectName,
            destinationId: activity.destinationId ?? undefined,
            destinationName: activity.destinationName ?? undefined
          },
          ...this.objects
        ];
      }
    }
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate = error as { error?: { message?: string } };
    return candidate.error?.message;
  }

  private requireLocation(group: AbstractControl): ValidationErrors | null {
    const destinationId = group.get('destinationId')?.value as number | null | undefined;
    const localityId = group.get('localityId')?.value as number | null | undefined;

    return destinationId || localityId
      ? null
      : { locationRequired: true };
  }

  private requireBothCoordinates(group: AbstractControl): ValidationErrors | null {
    const latitude = group.get('latitude')?.value as number | null | undefined;
    const longitude = group.get('longitude')?.value as number | null | undefined;

    if ((latitude == null && longitude == null) || (latitude != null && longitude != null)) {
      return null;
    }

    return { coordinatePairRequired: true };
  }

  private requireActivityType(group: AbstractControl): ValidationErrors | null {
    const selectTypeId = group.get('activityTypeId')?.value as number | null | undefined;
    const manualTypeId = group.get('fallbackActivityTypeId')?.value as number | null | undefined;

    return (selectTypeId ?? manualTypeId) ? null : { activityTypeRequired: true };
  }

  selectLocation(latitude: number, longitude: number): void {
    this.form.patchValue(
      {
        latitude,
        longitude
      },
      { emitEvent: false }
    );

    this.form.controls.latitude.markAsDirty();
    this.form.controls.longitude.markAsDirty();
    this.form.controls.latitude.markAsTouched();
    this.form.controls.longitude.markAsTouched();

    this.reverseGeocode(latitude, longitude);
  }

  private reverseGeocode(latitude: number, longitude: number): void {
    const requestId = ++this.geocodeRequestId;
    this.locationDetails = {
      ...this.locationDetails,
      loading: true
    };

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`;

    fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Reverse geocoding failed')))
      .then((payload: NominatimReverseResponse) => {
        if (requestId !== this.geocodeRequestId) {
          return;
        }

        const address = payload?.address ?? {};
        const city = this.pickCity(address);
        const street = this.pickStreet(address);
        const fullAddress = payload?.display_name?.trim() || [street, city].filter((part) => part && part !== '-').join(', ') || '-';

        this.locationDetails = {
          city,
          street,
          fullAddress,
          loading: false
        };
      })
      .catch(() => {
        if (requestId !== this.geocodeRequestId) {
          return;
        }

        const fallback = this.buildSelectionLocationDetails();
        this.locationDetails = {
          ...fallback,
          loading: false
        };
      });
  }

  private resetLocationDetails(): void {
    this.locationDetails = {
      city: '-',
      street: '-',
      fullAddress: '-',
      loading: false
    };
  }

  private pickCity(address: NominatimAddress): string {
    return (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      '-'
    );
  }

  private pickStreet(address: NominatimAddress): string {
    return (
      address.road ||
      address.pedestrian ||
      address.footway ||
      address.residential ||
      address.path ||
      address.neighbourhood ||
      '-'
    );
  }

  private buildSelectionLocationDetails(): { city: string; street: string; fullAddress: string } {
    const selectedDestinationId = this.form.controls.destinationId.value;
    const selectedLocalityId = this.form.controls.localityId.value;
    const selectedObjectId = this.form.controls.objectId.value;

    const selectedDestination = selectedDestinationId
      ? this.destinations.find((destination) => destination.id === selectedDestinationId)
      : undefined;
    const selectedLocality = selectedLocalityId
      ? this.localities.find((locality) => locality.id === selectedLocalityId)
      : undefined;
    const selectedObject = selectedObjectId
      ? this.objects.find((objectItem) => objectItem.id === selectedObjectId)
      : undefined;

    const city = selectedLocality?.name || selectedDestination?.name || '-';
    const street = selectedObject?.name || '-';

    const fullAddressParts = [selectedObject?.name, selectedLocality?.name, selectedDestination?.name]
      .filter((value): value is string => !!value && value.trim().length > 0);

    return {
      city,
      street,
      fullAddress: fullAddressParts.length > 0 ? fullAddressParts.join(', ') : '-'
    };
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
