import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './activity-create.component.html',
  styleUrl: './activity-create.component.css'
})
export class ActivityCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('activityMap') private activityMap?: ElementRef<HTMLDivElement>;

  private readonly draftKey = 'content-creator:add-activity-draft';
  private readonly defaultMapCenter: L.LatLngExpression = [42.424, 18.771];
  private readonly defaultMapZoom = 13;

  private map: L.Map | null = null;
  private mapMarker: L.Marker | null = null;
  private geocodeRequestId = 0;
  private forwardGeocodeRequestId = 0;

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

  ngOnInit(): void {
    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
      this.isEditMode = true;
      this.activityId = idFromRoute;
    }

    if (!this.isEditMode) {
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

    this.form.controls.latitude.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncMapFromForm());

    this.form.controls.longitude.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncMapFromForm());
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.syncMapFromForm();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.mapMarker = null;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Activity' : 'Create Activity';
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

    const confirmed = window.confirm('Delete this activity? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.activitiesService.delete(this.activityId)
      .pipe(finalize(() => {
        this.isDeleting = false;
      }))
      .subscribe({
        next: () => {
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
    }
  }

  private setLocationFromSelection(latitude: number, longitude: number): void {
    this.form.patchValue(
      {
        latitude,
        longitude
      },
      { emitEvent: false }
    );

    this.updateMapMarker(latitude, longitude);
    this.reverseGeocode(latitude, longitude);
  }

  private attachImagesAfterCreate(createdActivity: ActivityDto) {
    if (this.imageUrls.length === 0) {
      return of({ createdActivity, imageUploadFailed: false });
    }

    return this.activitiesService.attachImages(createdActivity.id, this.imageUrls).pipe(
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
        this.imageUrls = images
          .slice()
          .sort((first, second) => Number(second.isMain) - Number(first.isMain) || first.id - second.id)
          .map((image) => image.url)
          .filter((url) => typeof url === 'string' && url.length > 0);

        this.cdr.detectChanges();
      });
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

  private initializeMap(): void {
    if (!this.activityMap || this.map) {
      return;
    }

    const initialLat = this.toNumber(this.form.controls.latitude.value);
    const initialLng = this.toNumber(this.form.controls.longitude.value);
    const center: L.LatLngExpression = initialLat != null && initialLng != null
      ? [initialLat, initialLng]
      : this.defaultMapCenter;
    const zoom = initialLat != null && initialLng != null ? 15 : this.defaultMapZoom;

    this.map = L.map(this.activityMap.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
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

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.ngZone.run(() => this.selectLocation(event.latlng.lat, event.latlng.lng));
    });

    this.map.whenReady(() => {
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 0);
    });
  }

  private syncMapFromForm(): void {
    const latitude = this.toNumber(this.form.controls.latitude.value);
    const longitude = this.toNumber(this.form.controls.longitude.value);

    if (latitude == null || longitude == null) {
      this.resetLocationDetails();
      return;
    }

    this.updateMapMarker(latitude, longitude);
    this.reverseGeocode(latitude, longitude);
  }

  private selectLocation(latitude: number, longitude: number): void {
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

    this.updateMapMarker(latitude, longitude);
    this.reverseGeocode(latitude, longitude);
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

        this.locationDetails = {
          city: '-',
          street: '-',
          fullAddress: '-',
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

  private toNumber(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
