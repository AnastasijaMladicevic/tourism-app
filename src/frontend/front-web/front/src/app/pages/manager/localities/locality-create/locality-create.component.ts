import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DestinationService } from '../../../../services/destination.service';
import { CreateLocalityDto, LocalityService } from '../../../../services/locality.service';
import { MapComponent as SharedMapComponent } from '../../../../shared/components/map/map';

interface LocalityTypeOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-manager-locality-create',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent],
  templateUrl: './locality-create.component.html',
  styleUrls: ['./locality-create.component.css']
})
export class ManagerLocalityCreateComponent implements OnInit {
  private readonly localityService = inject(LocalityService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);

  isSubmitting = false;
  isLoadingOptions = true;
  errorMessage = '';

  destinationOptions: Array<{ id: number; name: string }> = [];
  localityTypeOptions: LocalityTypeOption[] = [];

  form: CreateLocalityDto = {
    name: '',
    description: '',
    destinationId: 0,
    localityTypeId: 0,
    latitude: undefined,
    longitude: undefined,
    imageUrl: ''
  };

  ngOnInit(): void {
    this.loadOptions();
  }

  get hasMapCoordinates(): boolean {
    return this.form.latitude != null && this.form.longitude != null;
  }

  get mapLat(): number {
    const value = Number(this.form.latitude);
    return Number.isFinite(value) ? value : 42.424;
  }

  get mapLng(): number {
    const value = Number(this.form.longitude);
    return Number.isFinite(value) ? value : 18.771;
  }

  get locationSummary(): string {
    const destinationName =
      this.destinationOptions.find((option) => option.id === Number(this.form.destinationId))?.name ?? '';
    if (destinationName) {
      return `Destination: ${destinationName}`;
    }
    return 'Set destination/locality for location context';
  }

  onSubmit(): void {
    if (this.isSubmitting || this.isLoadingOptions) {
      return;
    }

    if (!this.form.name.trim() || !this.form.destinationId || !this.form.localityTypeId) {
      this.errorMessage = 'Name, destination, and type are required.';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const payload: CreateLocalityDto = {
      name: this.form.name.trim(),
      description: this.form.description?.trim() || undefined,
      destinationId: Number(this.form.destinationId),
      localityTypeId: Number(this.form.localityTypeId),
      latitude: this.form.latitude != null ? Number(this.form.latitude) : undefined,
      longitude: this.form.longitude != null ? Number(this.form.longitude) : undefined,
      imageUrl: this.form.imageUrl?.trim() || undefined
    };

    this.localityService.create(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/manager/localities']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to create location.';
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/manager/localities']);
  }

  private loadOptions(): void {
    this.isLoadingOptions = true;

    this.destinationService
      .getAll({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .subscribe({
        next: (destResponse: unknown) => {
          const destinationsRaw = Array.isArray(destResponse)
            ? destResponse
            : (destResponse as { items?: unknown[] })?.items ?? [];
          const destinations = destinationsRaw as Array<{ id?: number; name?: string }>;

          this.destinationOptions = destinations
            .filter((d): d is { id: number; name: string } => typeof d.id === 'number' && !!d.name)
            .map((d) => ({ id: d.id, name: d.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

          if (this.destinationOptions.length > 0) {
            this.form.destinationId = this.destinationOptions[0].id;
          }

          this.localityService.getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }).subscribe({
            next: (localityResponse) => {
              const typeMap = new Map<number, string>();
              for (const item of localityResponse?.items ?? []) {
                if (item.localityTypeId && item.localityTypeName) {
                  typeMap.set(item.localityTypeId, item.localityTypeName);
                }
              }

              this.localityTypeOptions = Array.from(typeMap.entries())
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name));

              if (this.localityTypeOptions.length > 0) {
                this.form.localityTypeId = this.localityTypeOptions[0].id;
              }

              this.isLoadingOptions = false;
            },
            error: () => {
              this.localityTypeOptions = [];
              this.isLoadingOptions = false;
            }
          });
        },
        error: () => {
          this.destinationOptions = [];
          this.localityTypeOptions = [];
          this.isLoadingOptions = false;
        }
      });
  }
}
