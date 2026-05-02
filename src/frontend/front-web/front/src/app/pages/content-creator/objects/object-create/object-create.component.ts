import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import {
  CreateObjectDto,
  ObjectService,
  ObjectTypeOption,
  UpdateObjectDto
} from '../../../../services/object';
import { ActivitiesService, LocalityOption } from '../../../../services/activities';
import { DestinationDto, DestinationService } from '../../../../services/destination.service';
import { MapComponent as SharedMapComponent } from '../../../../shared/components/map/map';

type WorkingDayKey = 'pon' | 'uto' | 'sre' | 'cet' | 'pet' | 'sub' | 'ned';

@Component({
  selector: 'app-object-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SharedMapComponent],
  templateUrl: './object-create.component.html',
  styleUrl: './object-create.component.css'
})
export class ObjectCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly objectService = inject(ObjectService);
  private readonly destinationService = inject(DestinationService);
  private readonly activitiesService = inject(ActivitiesService);

  /** Manager opens this page read-only via `/manager/objects/review/:id` (route data). */
  isManagerReview = false;

  readonly workingDays: Array<{ key: WorkingDayKey; label: string }> = [
    { key: 'pon', label: 'Monday' },
    { key: 'uto', label: 'Tuesday' },
    { key: 'sre', label: 'Wednesday' },
    { key: 'cet', label: 'Thursday' },
    { key: 'pet', label: 'Friday' },
    { key: 'sub', label: 'Saturday' },
    { key: 'ned', label: 'Sunday' }
  ];

  objectTypes: ObjectTypeOption[] = [];
  destinations: DestinationDto[] = [];
  localities: LocalityOption[] = [];

  isLoadingOptions = true;
  isLoadingObject = false;
  isSubmitting = false;
  errorMessage = '';
  isEditMode = false;
  objectId: number | null = null;

  form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    address: this.fb.nonNullable.control('', [Validators.maxLength(300)]),
    description: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
    objectTypeId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    destinationId: this.fb.control<number | null>(null),
    localityId: this.fb.control<number | null>(null),
    price: this.fb.control<number | null>(null, [Validators.min(0)]),
    latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
    longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    imageUrl: this.fb.nonNullable.control(''),
    amenitiesInput: this.fb.nonNullable.control('')
  });

  workingHoursForm = this.fb.group({
    ponOpen: this.fb.nonNullable.control(''),
    ponClose: this.fb.nonNullable.control(''),
    utoOpen: this.fb.nonNullable.control(''),
    utoClose: this.fb.nonNullable.control(''),
    sreOpen: this.fb.nonNullable.control(''),
    sreClose: this.fb.nonNullable.control(''),
    cetOpen: this.fb.nonNullable.control(''),
    cetClose: this.fb.nonNullable.control(''),
    petOpen: this.fb.nonNullable.control(''),
    petClose: this.fb.nonNullable.control(''),
    subOpen: this.fb.nonNullable.control(''),
    subClose: this.fb.nonNullable.control(''),
    nedOpen: this.fb.nonNullable.control(''),
    nedClose: this.fb.nonNullable.control('')
  });

  ngOnInit(): void {
    this.isManagerReview = this.route.snapshot.data['managerReview'] === true;

    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    if (this.isManagerReview) {
      if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
        this.isEditMode = true;
        this.objectId = idFromRoute;
      }
    } else if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
      this.isEditMode = true;
      this.objectId = idFromRoute;
    }

    this.loadOptions();

    this.form.controls.destinationId.valueChanges.subscribe(() => {
      this.applyLocationFromSelection();
    });

    this.form.controls.localityId.valueChanges.subscribe(() => {
      this.applyLocationFromSelection();
    });

    if (this.isEditMode && this.objectId) {
      this.loadObject(this.objectId);
    }
  }

  get pageTitle(): string {
    if (this.isManagerReview) {
      return 'Review object';
    }
    return this.isEditMode ? 'Edit Object' : 'Create Object';
  }

  get pageIntro(): string {
    if (this.isManagerReview) {
      return 'View object details submitted for approval. Editing is disabled.';
    }
    return 'Add a new object with location, details, amenities, and opening hours.';
  }

  get objectsListPath(): string {
    return this.isManagerReview ? '/manager/objects' : '/content-creator/objects';
  }

  get eyebrowLabel(): string {
    return this.isManagerReview ? 'Objects review' : 'Objects management';
  }

  get filteredLocalities(): LocalityOption[] {
    const destinationId = this.form.controls.destinationId.value;
    if (!destinationId) {
      return this.localities;
    }

    return this.localities.filter((locality) => locality.destinationId === destinationId);
  }

  get mapLat(): number {
    return this.form.controls.latitude.value ?? 42.424;
  }

  get mapLng(): number {
    return this.form.controls.longitude.value ?? 18.771;
  }

  get hasMapCoordinates(): boolean {
    return this.form.controls.latitude.value != null && this.form.controls.longitude.value != null;
  }

  get imagePreviewUrl(): string {
    const raw = this.form.controls.imageUrl.value.trim();
    if (!raw) {
      return '';
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    return '';
  }

  get locationSummary(): string {
    const localityId = this.form.controls.localityId.value;
    const destinationId = this.form.controls.destinationId.value;
    const localityName = localityId ? this.localities.find((item) => item.id === localityId)?.name : '';
    const destinationName = destinationId ? this.destinations.find((item) => item.id === destinationId)?.name : '';

    if (localityName && destinationName) {
      return `${localityName}, ${destinationName}`;
    }

    return localityName || destinationName || 'Set destination/locality for location context';
  }

  get latitudeLabel(): string {
    const value = this.form.controls.latitude.value;
    return value == null ? '-' : Number(value).toFixed(6);
  }

  get longitudeLabel(): string {
    const value = this.form.controls.longitude.value;
    return value == null ? '-' : Number(value).toFixed(6);
  }

  getWorkingOpenControl(day: WorkingDayKey) {
    switch (day) {
      case 'pon': return this.workingHoursForm.controls.ponOpen;
      case 'uto': return this.workingHoursForm.controls.utoOpen;
      case 'sre': return this.workingHoursForm.controls.sreOpen;
      case 'cet': return this.workingHoursForm.controls.cetOpen;
      case 'pet': return this.workingHoursForm.controls.petOpen;
      case 'sub': return this.workingHoursForm.controls.subOpen;
      case 'ned': return this.workingHoursForm.controls.nedOpen;
    }
  }

  getWorkingCloseControl(day: WorkingDayKey) {
    switch (day) {
      case 'pon': return this.workingHoursForm.controls.ponClose;
      case 'uto': return this.workingHoursForm.controls.utoClose;
      case 'sre': return this.workingHoursForm.controls.sreClose;
      case 'cet': return this.workingHoursForm.controls.cetClose;
      case 'pet': return this.workingHoursForm.controls.petClose;
      case 'sub': return this.workingHoursForm.controls.subClose;
      case 'ned': return this.workingHoursForm.controls.nedClose;
    }
  }

  submit(): void {
    if (this.isManagerReview) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const destinationId = this.form.controls.destinationId.value ?? undefined;
    const localityId = this.form.controls.localityId.value ?? undefined;
    if (!destinationId && !localityId) {
      this.errorMessage = 'Please choose destination or locality.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateObjectDto | UpdateObjectDto = {
      name: this.form.controls.name.value?.trim() || '',
      address: this.optionalTrimmed(this.form.controls.address.value),
      description: this.optionalTrimmed(this.form.controls.description.value),
      objectTypeId: Number(this.form.controls.objectTypeId.value),
      destinationId,
      localityId,
      price: this.form.controls.price.value ?? undefined,
      latitude: this.form.controls.latitude.value ?? undefined,
      longitude: this.form.controls.longitude.value ?? undefined,
      workingHours: this.buildWorkingHoursPayload(),
      amenities: this.parseAmenities(this.form.controls.amenitiesInput.value)
    };

    const request$ = this.isEditMode && this.objectId
      ? this.objectService.update(this.objectId, payload as UpdateObjectDto)
      : this.objectService.create(payload as CreateObjectDto);

    request$.pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (created) => {
        if (this.isEditMode) {
          this.router.navigate(['/content-creator/objects']);
          return;
        }

        const imageUrl = this.optionalTrimmed(this.form.controls.imageUrl.value);
        if (!imageUrl) {
          this.router.navigate(['/content-creator/objects']);
          return;
        }

        this.objectService.addImage(created.id, { url: imageUrl, isMain: true }).subscribe({
          next: () => this.router.navigate(['/content-creator/objects']),
          error: () => this.router.navigate(['/content-creator/objects'])
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to create object.';
      }
    });
  }

  private loadOptions(): void {
    this.isLoadingOptions = true;

    forkJoin({
      objectTypes: this.objectService.getObjectTypeOptions().pipe(catchError(() => of([]))),
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
      localities: this.activitiesService.getLocalityOptions().pipe(catchError(() => of([])))
    }).pipe(
      finalize(() => {
        this.isLoadingOptions = false;
      })
    ).subscribe(({ objectTypes, destinations, localities }) => {
      this.objectTypes = objectTypes;
      this.destinations = destinations;
      this.localities = localities;
      this.applyLocationFromSelection();
    });
  }

  private loadObject(id: number): void {
    this.isLoadingObject = true;
    this.errorMessage = '';

    this.objectService.getById(id).pipe(
      finalize(() => {
        this.isLoadingObject = false;
      })
    ).subscribe({
      next: (objectItem) => {
        this.form.patchValue({
          name: objectItem.name ?? '',
          address: objectItem.address ?? '',
          description: objectItem.description ?? '',
          objectTypeId: objectItem.objectTypeId ?? null,
          destinationId: objectItem.destinationId ?? null,
          localityId: objectItem.localityId ?? null,
          price: objectItem.price ?? null,
          latitude: objectItem.latitude ?? null,
          longitude: objectItem.longitude ?? null,
          imageUrl: objectItem.mainImageUrl ?? '',
          amenitiesInput: (objectItem.amenities ?? []).join(', ')
        }, { emitEvent: false });

        this.patchWorkingHours(objectItem.workingHours);
        this.applyManagerReadOnlyState();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load object details.';
      }
    });
  }

  private applyLocationFromSelection(): void {
    const selectedLocalityId = this.form.controls.localityId.value;
    const selectedDestinationId = this.form.controls.destinationId.value;

    const selectedLocality = selectedLocalityId
      ? this.localities.find((locality) => locality.id === selectedLocalityId)
      : undefined;
    const localityLat = this.toNumber(selectedLocality?.latitude);
    const localityLng = this.toNumber(selectedLocality?.longitude);
    if (localityLat != null && localityLng != null) {
      this.form.patchValue(
        {
          latitude: localityLat,
          longitude: localityLng
        },
        { emitEvent: false }
      );
      return;
    }

    const selectedDestination = selectedDestinationId
      ? this.destinations.find((destination) => destination.id === selectedDestinationId)
      : undefined;
    const destinationLat = this.toNumber(selectedDestination?.latitude);
    const destinationLng = this.toNumber(selectedDestination?.longitude);
    if (destinationLat != null && destinationLng != null) {
      this.form.patchValue(
        {
          latitude: destinationLat,
          longitude: destinationLng
        },
        { emitEvent: false }
      );
    }
  }

  private buildWorkingHoursPayload(): string | undefined {
    const result: Partial<Record<WorkingDayKey, string>> = {};
    for (const day of this.workingDays) {
      const open = this.workingHoursForm.controls[`${day.key}Open`].value.trim();
      const close = this.workingHoursForm.controls[`${day.key}Close`].value.trim();
      if (open && close) {
        result[day.key] = `${open}-${close}`;
      }
    }

    return Object.keys(result).length > 0 ? JSON.stringify(result) : undefined;
  }

  private parseAmenities(raw: string): string[] | undefined {
    const amenities = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return amenities.length > 0 ? amenities : undefined;
  }

  private optionalTrimmed(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private applyManagerReadOnlyState(): void {
    if (!this.isManagerReview) {
      return;
    }

    this.form.disable({ emitEvent: false });
    this.workingHoursForm.disable({ emitEvent: false });
  }

  private patchWorkingHours(workingHours?: string): void {
    const resetValues = {
      ponOpen: '', ponClose: '',
      utoOpen: '', utoClose: '',
      sreOpen: '', sreClose: '',
      cetOpen: '', cetClose: '',
      petOpen: '', petClose: '',
      subOpen: '', subClose: '',
      nedOpen: '', nedClose: ''
    };
    this.workingHoursForm.patchValue(resetValues, { emitEvent: false });

    if (!workingHours?.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(workingHours) as Record<string, string>;
      for (const day of this.workingDays) {
        const value = parsed[day.key];
        if (!value || !value.includes('-')) {
          continue;
        }

        const [open, close] = value.split('-');
        if (!open || !close) {
          continue;
        }

        this.workingHoursForm.patchValue({
          [`${day.key}Open`]: open.trim(),
          [`${day.key}Close`]: close.trim()
        }, { emitEvent: false });
      }
    } catch {
      // ignore malformed working hours payload
    }
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
