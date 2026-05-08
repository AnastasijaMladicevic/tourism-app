import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
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
export class ManagerLocalityCreateComponent implements OnInit, OnDestroy {
  private readonly localityService = inject(LocalityService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);

  isSubmitting = false;
  isLoadingOptions = true;
  errorMessage = '';

  destinationOptions: Array<{ id: number; name: string }> = [];
  localityTypeOptions: LocalityTypeOption[] = [];
  pendingImageNames = '';
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  primaryImageIndex = 0;

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

  ngOnDestroy(): void {
    this.imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
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
      longitude: this.form.longitude != null ? Number(this.form.longitude) : undefined
    };

    this.localityService.create(payload).subscribe({
      next: (created) => {
        if (!this.imageFiles.length) {
          this.isSubmitting = false;
          this.router.navigate(['/manager/localities']);
          return;
        }

        this.localityService
          .attachImages(created.id, this.imageFiles, this.primaryImageIndex)
          .pipe(finalize(() => (this.isSubmitting = false)))
          .subscribe({
            next: () => {
              this.router.navigate(['/manager/localities']);
            },
            error: (error) => {
              this.errorMessage = error?.error?.message ?? 'Location created, but image upload failed.';
            }
          });
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

  onPickImages(input: HTMLInputElement): void {
    input.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      return;
    }

    for (const file of imageFiles) {
      this.imageFiles.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    }

    this.pendingImageNames = this.imageFiles.map((file) => file.name).join(', ');
    input.value = '';
  }

  removeImage(index: number): void {
    const preview = this.imagePreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    this.imageFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);

    if (this.primaryImageIndex >= this.imageFiles.length) {
      this.primaryImageIndex = Math.max(0, this.imageFiles.length - 1);
    }

    this.pendingImageNames = this.imageFiles.map((file) => file.name).join(', ');
  }

  setPrimaryImage(index: number): void {
    this.primaryImageIndex = index;
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
