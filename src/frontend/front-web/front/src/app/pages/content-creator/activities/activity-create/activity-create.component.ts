import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import {
  ActivitiesService,
  ActivityTypeOption,
  CreateActivityDto,
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
export class ActivityCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);

  private readonly draftKey = 'content-creator:add-activity-draft';

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
  isLoadingOptions = true;
  errorMessage = '';
  successMessage = '';

  activityTypes: ActivityTypeOption[] = [];
  destinations: DestinationDto[] = [];
  localities: LocalityOption[] = [];
  objects: ObjectOption[] = [];

  pendingImageUrl = '';
  imageUrls: string[] = [];

  ngOnInit(): void {
    this.loadDraft();
    this.loadOptions();

    this.form.controls.destinationId.valueChanges.subscribe(() => {
      this.syncDependentSelections();
    });
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

  get mapPinLeft(): string {
    const longitude = this.form.controls.longitude.value;
    if (longitude == null) {
      return '55%';
    }

    const normalized = ((longitude + 180) / 360) * 100;
    const clamped = Math.min(94, Math.max(6, normalized));
    return `${clamped.toFixed(2)}%`;
  }

  get mapPinTop(): string {
    const latitude = this.form.controls.latitude.value;
    if (latitude == null) {
      return '48%';
    }

    const normalized = ((90 - latitude) / 180) * 100;
    const clamped = Math.min(94, Math.max(6, normalized));
    return `${clamped.toFixed(2)}%`;
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

  saveDraft(): void {
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

    const dto: CreateActivityDto = {
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

    this.activitiesService.create(dto)
      .pipe(
        switchMap((createdActivity) => this.attachImagesAfterCreate(createdActivity)),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: ({ createdActivity, imageUploadFailed }) => {
          localStorage.removeItem(this.draftKey);
          this.successMessage = imageUploadFailed
            ? 'Activity created, but some images could not be attached.'
            : 'Activity created successfully.';

          setTimeout(() => {
            this.router.navigate(['/content-creator/activities']);
          }, 900);

          this.errorMessage = '';
        },
        error: (error: unknown) => {
          const message = this.extractErrorMessage(error) ?? 'Failed to create activity.';
          this.errorMessage = message;
          this.successMessage = '';
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
          destinationName: item.destinationName
        }))),
        catchError(() => of([]))
      )
    }).subscribe(({ activityTypes, destinations, localities, objects }) => {
      this.activityTypes = activityTypes;
      this.destinations = destinations;
      this.localities = localities;
      this.objects = objects;
      this.syncDependentSelections();
      this.isLoadingOptions = false;
    });
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
}
