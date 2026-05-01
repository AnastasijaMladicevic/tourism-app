import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  CreateObjectDto,
  ObjectService,
  ObjectTypeOption
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
  private readonly objectService = inject(ObjectService);
  private readonly destinationService = inject(DestinationService);
  private readonly activitiesService = inject(ActivitiesService);

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
  isSubmitting = false;
  errorMessage = '';

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
    this.loadOptions();
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

    const payload: CreateObjectDto = {
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

    this.objectService.create(payload).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (created) => {
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
      destinations: this.destinationService.getAll().pipe(catchError(() => of([]))),
      localities: this.activitiesService.getLocalityOptions().pipe(catchError(() => of([])))
    }).pipe(
      finalize(() => {
        this.isLoadingOptions = false;
      })
    ).subscribe(({ objectTypes, destinations, localities }) => {
      this.objectTypes = objectTypes;
      this.destinations = destinations;
      this.localities = localities;
    });
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
}
