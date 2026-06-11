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
import { Observable, catchError, finalize, forkJoin, from, map, of, switchMap } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapComponent } from '../../../../shared/components/map/map';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
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
import { RegionDto, RegionService } from '../../../../services/region';
import { EventService } from '../../../../services/event.service';
import { TranslationService } from '../../../../services/translation.service';
import { isPointInGeoJson } from '../../../../shared/utils/geo-utils';

interface ObjectOption {
  id: number;
  name: string;
  destinationId?: number;
  destinationName?: string;
  localityId?: number;
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

@Component({
  selector: 'app-activity-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapComponent, TranslatePipe],
  templateUrl: './activity-create.component.html',
  styleUrls: [
    './activity-create.component.css',
    '../../../admin/shared/admin-page-title.css',
    '../../../shared/location-sidebar.css'
  ]
})
export class ActivityCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly regionService = inject(RegionService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly translationService = inject(TranslationService);

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
  galleryErrorMessage = '';
  successMessage = '';

  activityTypes: ActivityTypeOption[] = [];
  regions: RegionDto[] = [];
  destinations: DestinationDto[] = [];
  localities: LocalityOption[] = [];
  selectedRegionId: number | null = null;
  objects: ObjectOption[] = [];
  private loadedActivity: ActivityDto | null = null;
  private deletionRequestSubmitted = false;
  private readonly maxImageCount = 8;

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

  imageUrls: string[] = [];

  imagesSnapshot: ActivityImageDto[] = [];
  /** True if GET /activities/:id/images returned at least one row — activity already has a main image in DB. */
  private readonly pendingImageFiles = new Map<string, File>();

  private scrollPageToTop(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const scrollableContainers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.page-outlet, .main-content, .content, .page-content, .workspace'
      )
    );
    for (const container of scrollableContainers) {
      container.scrollTop = 0;
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      for (const container of scrollableContainers) {
        container.scrollTop = 0;
      }
    }, 0);
  }

  ngOnInit(): void {
    this.scrollPageToTop();

    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
      this.isEditMode = true;
      this.activityId = idFromRoute;
    }

    this.loadOptions();

    if (this.isEditMode) {
      this.loadActivity();
    }

    this.form.controls.destinationId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncRegionFromDestination();
      this.syncDependentSelections();
      this.applyLocationFromSelection();
    });

    this.form.controls.localityId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncDestinationFromLocality();
      this.applyLocationFromSelection();
    });

    this.form.controls.objectId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncDestinationAndLocalityFromObject();
      this.applyLocationFromSelection();
    });
  }

  ngOnDestroy(): void {
    this.releasePendingImagePreviews();
  }

  get pageTitle(): string {
    return this.translationService.translate(
      this.isEditMode ? 'contentCreator.activityForm.editTitle' : 'contentCreator.activityForm.createTitle',
    );
  }

  get isSubmitDisabled(): boolean {
    return this.isSubmitting || this.isLoadingOptions || this.form.invalid || !this.hasRequiredCreateFields;
  }

  get hasRequiredCreateFields(): boolean {
    const name = this.form.controls.name.value?.trim();
    const activityTypeId =
      this.form.controls.activityTypeId.value ?? this.form.controls.fallbackActivityTypeId.value;

    return Boolean(
      name &&
      activityTypeId != null &&
      activityTypeId >= 1 &&
      this.imageUrls.length > 0
    );
  }

  get isApprovedActivity(): boolean {
    return (this.loadedActivity?.status ?? '').toLowerCase() === 'approved';
  }

  get deleteModalTitle(): string {
    return this.translationService.translate(
      this.isApprovedActivity ? 'contentCreator.activityForm.delete.requestTitle' : 'contentCreator.activityForm.delete.confirmTitle',
    );
  }

  get deleteModalDescription(): string {
    return this.translationService.translate(
      this.isApprovedActivity
        ? 'contentCreator.activityForm.delete.requestDescription'
        : 'contentCreator.activityForm.delete.confirmDescription',
    );
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
    if (destinationId) {
      return this.localities.filter((l) => l.destinationId === destinationId);
    }
    if (this.selectedRegionId) {
      const regionDestIds = new Set(this.destinations.map((d) => d.id));
      return this.localities.filter((l) => regionDestIds.has(l.destinationId));
    }
    return this.localities;
  }

  onRegionChange(regionId: number | null): void {
    this.selectedRegionId = regionId;
    this.form.patchValue({ destinationId: null, localityId: null, objectId: null }, { emitEvent: false });
    this.applyLocationFromSelection();
    this.loadDestinationsForRegion(regionId);
  }

  private loadDestinationsForRegion(regionId: number | null): void {
    this.destinationService.getAll(
      {
        page: 1,
        pageSize: 300,
        sortBy: 'name',
        sortOrder: 'asc',
        ...(regionId != null ? { regionId } : {})
      },
      { bypassRegion: true }
    ).pipe(
      map((response: DestinationDto[] | { items?: DestinationDto[] }) =>
        Array.isArray(response) ? response : (response.items ?? [])
      ),
      catchError(() => of([] as DestinationDto[]))
    ).subscribe((destinations) => {
      this.destinations = destinations;
      this.cdr.detectChanges();
    });
  }

  get selectedDestination(): DestinationDto | null {
    const destinationId = this.form.controls.destinationId.value;
    if (!destinationId) {
      return null;
    }

    return this.destinations.find((destination) => destination.id === destinationId) ?? null;
  }

  get selectedDestinationBoundary(): string | undefined {
    return this.selectedDestination?.boundaryGeoJson;
  }

  // Vraca true ako je tacka unutar granice izabrane destinacije, ili ako granica nije definisana (preskace proveru).
  private isWithinSelectedDestination(lat: number, lng: number): boolean {
    const boundary = this.selectedDestinationBoundary;
    if (!boundary) {
      return true;
    }
    return isPointInGeoJson(lng, lat, boundary);
  }

  // Pronalazi prvu destinaciju iz ucitane liste cija granica sadrzi datu tacku.
  private findDestinationContainingPoint(lat: number, lng: number): DestinationDto | null {
    return this.destinations.find((d) => d.boundaryGeoJson && isPointInGeoJson(lng, lat, d.boundaryGeoJson)) ?? null;
  }

  get selectedRegion(): RegionDto | undefined {
    if (this.selectedRegionId == null) {
      return undefined;
    }
    return this.regions.find((r) => r.id === this.selectedRegionId);
  }

  get selectedRegionBoundary(): string | undefined {
    return this.selectedRegion?.boundaryGeoJson;
  }

  private isWithinSelectedRegion(lat: number, lng: number): boolean {
    const boundary = this.selectedRegionBoundary;
    if (!boundary) {
      return true;
    }
    return isPointInGeoJson(lng, lat, boundary);
  }

  get activeBoundaryGeoJson(): string | undefined {
    return this.selectedDestinationBoundary ?? this.selectedRegionBoundary;
  }

  get filteredObjects(): ObjectOption[] {
    const destinationId = this.form.controls.destinationId.value;
    if (!destinationId) {
      return this.objects;
    }

    return this.objects.filter((objectItem) => !objectItem.destinationId || objectItem.destinationId === destinationId);
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!selectedFiles.length) {
      return;
    }

    const remainingSlots = this.maxImageCount - this.imageUrls.length;
    if (remainingSlots <= 0) {
      this.galleryErrorMessage = this.translationService.translate('contentCreator.activityForm.errors.uploadLimit', {
        count: this.maxImageCount,
      });
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
      this.galleryErrorMessage = this.translationService.translate('contentCreator.activityForm.errors.duplicateImages', {
        files: duplicateNames.join(', '),
      });
    } else if (acceptedFiles.length < selectedFiles.length) {
      this.galleryErrorMessage = this.translationService.translate('contentCreator.activityForm.errors.partialUpload', {
        accepted: remainingSlots,
        count: this.maxImageCount,
      });
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

  cancel(): void {
    this.router.navigate(['/content-creator/activities']);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.imageUrls.length === 0) {
      this.galleryErrorMessage = this.translationService.translate('contentCreator.activityForm.errors.imageRequired');
      return;
    }

    const lat = this.form.controls.latitude.value;
    const lng = this.form.controls.longitude.value;
    if (lat != null && lng != null && !this.isWithinSelectedDestination(lat, lng)) {
      this.errorMessage = this.translationService.translate('contentCreator.activityForm.errors.outsideDestination', {
        destination: this.selectedDestination?.name ?? ''
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const values = this.form.getRawValue();
    const activityTypeId = values.activityTypeId ?? values.fallbackActivityTypeId;

    if (!activityTypeId) {
      this.isSubmitting = false;
      this.errorMessage = this.translationService.translate('contentCreator.activityForm.errors.typeRequired');
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
        switchMap((createdActivity) =>
          this.isEditMode && this.activityId
            ? this.syncImagesAfterSave(this.activityId, this.imageUrls, this.imagesSnapshot).pipe(
              map(() => ({ createdActivity, imageUploadFailed: false })),
              catchError(() => of({ createdActivity, imageUploadFailed: true }))
            )
            : this.attachImagesAfterCreate(createdActivity)
        ),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: ({ imageUploadFailed }) => {
          this.successMessage = imageUploadFailed
            ? this.translationService.translate('contentCreator.activityForm.success.partialImageUpload')
            : this.translationService.translate(
              this.isEditMode ? 'contentCreator.activityForm.success.updated' : 'contentCreator.activityForm.success.created',
            );

          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 900);

          this.errorMessage = '';
        },
        error: (error: unknown) => {
          const message = this.extractErrorMessage(error) ?? this.translationService.translate('contentCreator.activityForm.errors.saveFailed');
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
          this.successMessage = this.translationService.translate('contentCreator.activityForm.success.deletionRequested');
          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 1200);
        },
        error: (error: unknown) => {
          this.errorMessage = this.extractErrorMessage(error) ?? this.translationService.translate('contentCreator.activityForm.errors.deletionRequestFailed');
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
          this.successMessage = this.translationService.translate('contentCreator.activityForm.success.deleted');
          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 700);
        },
        error: (error: unknown) => {
          this.errorMessage = this.extractErrorMessage(error) ?? this.translationService.translate('contentCreator.activityForm.errors.deleteFailed');
        }
      });
  }

  private loadOptions(): void {
    this.isLoadingOptions = true;

    forkJoin({
      activityTypes: this.activitiesService.getActivityTypeOptions().pipe(catchError(() => of([]))),
      regions: this.regionService.getAll().pipe(catchError(() => of([]))),
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
          localityId: (item as unknown as { localityId?: number }).localityId,
          latitude: (item as unknown as { latitude?: number }).latitude,
          longitude: (item as unknown as { longitude?: number }).longitude
        }))),
        catchError(() => of([]))
      )
    }).subscribe(({ activityTypes, regions, destinations, localities, objects }) => {
      this.activityTypes = activityTypes;
      this.regions = regions;
      this.localities = localities;
      this.objects = objects;

      // In edit mode, pre-select the region from the loaded activity
      const regionId = this.loadedActivity?.regionId ?? null;
      if (regionId != null) {
        this.selectedRegionId = regionId;
        this.destinations = destinations.filter((d) => d.regionId === regionId);
      } else {
        this.destinations = destinations;
      }

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
    if (this.imageUrls.length === 0) {
      return of({ createdActivity, imageUploadFailed: false });
    }

    return this.uploadPendingImages(createdActivity.id, this.imageUrls, 0)
      .pipe(
        map(() => ({ createdActivity, imageUploadFailed: false })),
        catchError(() => of({ createdActivity, imageUploadFailed: true }))
      );
  }

  private syncImagesAfterSave(
    activityId: number,
    desiredOrdered: string[],
    snapshot: ActivityImageDto[]
  ): Observable<void> {
    const desired = desiredOrdered.map((url) => url.trim()).filter((url) => url.length > 0);
    const desiredExistingSet = new Set(desired.filter((url) => !this.pendingImageFiles.has(url)));

    const toDelete = snapshot.filter((image) => !desiredExistingSet.has(image.url.trim()));
    const surviving = snapshot.filter((image) => desiredExistingSet.has(image.url.trim()));

    const urlToId = new Map<string, number>();
    for (const image of surviving) {
      urlToId.set(image.url.trim(), image.id);
    }

    const delete$ =
      toDelete.length === 0
        ? of(undefined)
        : forkJoin(toDelete.map((image) => this.activitiesService.deleteImageById(image.id))).pipe(
          map(() => undefined),
          catchError(() => of(undefined))
        );

    return delete$.pipe(
      switchMap(() => this.uploadPendingImages(activityId, desired, surviving.length, urlToId)),
      switchMap((updatedMap) => this.ensureMainImage(desired, updatedMap))
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
          this.errorMessage = this.extractErrorMessage(error) ?? this.translationService.translate('contentCreator.activityForm.errors.loadEditFailed');
        }
      });
  }

  /** When the destination changes, auto-fill the region from that destination's region. */
  private syncRegionFromDestination(): void {
    const destinationId = this.form.controls.destinationId.value;
    if (destinationId == null) {
      return;
    }

    const destination = this.destinations.find((d) => d.id === destinationId);
    if (destination?.regionId != null) {
      this.selectedRegionId = destination.regionId;
    }
  }

  /** When the locality changes, auto-fill the destination (and through it, the region). */
  private syncDestinationFromLocality(): void {
    const localityId = this.form.controls.localityId.value;
    if (localityId == null) {
      return;
    }

    const locality = this.localities.find((l) => l.id === localityId);
    if (!locality) {
      return;
    }

    if (this.form.controls.destinationId.value !== locality.destinationId) {
      this.form.patchValue({ destinationId: locality.destinationId }, { emitEvent: false });
      this.syncDependentSelections();
    }

    this.syncRegionFromDestination();
  }

  /** When the object changes, auto-fill the locality and destination (and through it, the region). */
  private syncDestinationAndLocalityFromObject(): void {
    const objectId = this.form.controls.objectId.value;
    if (objectId == null) {
      return;
    }

    const objectItem = this.objects.find((o) => o.id === objectId);
    if (!objectItem) {
      return;
    }

    const patch: Record<string, number> = {};

    if (objectItem.destinationId != null && this.form.controls.destinationId.value !== objectItem.destinationId) {
      patch['destinationId'] = objectItem.destinationId;
    }

    if (objectItem.localityId != null && this.form.controls.localityId.value !== objectItem.localityId) {
      patch['localityId'] = objectItem.localityId;
    }

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
      this.syncDependentSelections();
    }

    this.syncRegionFromDestination();
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

  private loadActivityImages(activityId: number): void {
    this.activitiesService.getImages(activityId)
      .pipe(catchError(() => of([] as ActivityImageDto[])))
      .subscribe((images) => {
        this.imagesSnapshot = images.map((image) => ({ ...image }));

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
        }

        this.cdr.detectChanges();
      });
  }

  private uploadPendingImages(
    activityId: number,
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
        this.activitiesService.addImage(activityId, entry.file, existingCount === 0 && index === 0).pipe(
          map((dto) => {
            urlToId.set(entry.previewUrl, dto.id);
            return dto;
          })
        )
      ),
      toArray(),
      map(() => urlToId)
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

    return this.activitiesService.setMainImage(mainId).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
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

  get latitudeDirection(): 'N' | 'S' {
    const lat = Number(this.form.controls.latitude.value);
    return Number.isFinite(lat) && lat < 0 ? 'S' : 'N';
  }

  get longitudeDirection(): 'E' | 'W' {
    const lng = Number(this.form.controls.longitude.value);
    return Number.isFinite(lng) && lng < 0 ? 'W' : 'E';
  }

  selectLocation(latitude: number, longitude: number): void {
    const destinationId = this.form.controls.destinationId.value;

    if (destinationId) {
      if (!this.isWithinSelectedDestination(latitude, longitude)) {
        this.errorMessage = this.translationService.translate('contentCreator.activityForm.errors.outsideDestination', {
          destination: this.selectedDestination?.name ?? ''
        });
        this.cdr.detectChanges();
        return;
      }

      this.errorMessage = '';
    } else {
      // Nijedna destinacija jos nije izabrana - pokusaj automatsko prepoznavanje po klikom izabranoj tacki.
      const matched = this.findDestinationContainingPoint(latitude, longitude);
      if (matched) {
        this.errorMessage = '';
        if (matched.regionId != null && this.selectedRegionId !== matched.regionId) {
          this.selectedRegionId = matched.regionId;
          this.loadDestinationsForRegion(matched.regionId);
        }
        this.form.patchValue({ destinationId: matched.id }, { emitEvent: false });
        this.syncDependentSelections();
      } else if (this.selectedRegionId != null && !this.isWithinSelectedRegion(latitude, longitude)) {
        this.errorMessage = this.translationService.translate('contentCreator.activityForm.errors.outsideRegion', {
          region: this.selectedRegion?.name ?? ''
        });
        this.cdr.detectChanges();
        return;
      } else {
        this.errorMessage = '';
      }
    }

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
    this.cdr.detectChanges();
  }

  onCoordinateInputChanged(): void {
    const lat = this.toNumber(this.form.controls.latitude.value);
    const lng = this.toNumber(this.form.controls.longitude.value);

    if (lat == null || lng == null) {
      return;
    }

    const destinationId = this.form.controls.destinationId.value;
    const outsideMessage = this.translationService.translate('contentCreator.activityForm.errors.outsideDestination', {
      destination: this.selectedDestination?.name ?? ''
    });

    if (destinationId) {
      if (!this.isWithinSelectedDestination(lat, lng)) {
        this.errorMessage = outsideMessage;
        return;
      }

      if (this.errorMessage === outsideMessage) {
        this.errorMessage = '';
      }

      this.reverseGeocode(lat, lng);
      return;
    }

    // Nijedna destinacija jos nije izabrana - pokusaj automatsko prepoznavanje po unetim koordinatama.
    const matched = this.findDestinationContainingPoint(lat, lng);
    if (matched) {
      this.errorMessage = '';
      if (matched.regionId != null && this.selectedRegionId !== matched.regionId) {
        this.selectedRegionId = matched.regionId;
        this.loadDestinationsForRegion(matched.regionId);
      }
      this.form.patchValue({ destinationId: matched.id }, { emitEvent: false });
      this.syncDependentSelections();
    } else if (this.selectedRegionId != null) {
      const outsideRegionMessage = this.translationService.translate('contentCreator.activityForm.errors.outsideRegion', {
        region: this.selectedRegion?.name ?? ''
      });

      if (!this.isWithinSelectedRegion(lat, lng)) {
        this.errorMessage = outsideRegionMessage;
        this.cdr.detectChanges();
        return;
      }

      if (this.errorMessage === outsideRegionMessage) {
        this.errorMessage = '';
      }
    }

    this.reverseGeocode(lat, lng);
    this.cdr.detectChanges();
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
