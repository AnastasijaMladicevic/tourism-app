import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  CreateDestinationDto,
  DestinationDto,
  DestinationService,
  UpdateDestinationDto
} from '../../../services/destination.service';
import { RegionDto, RegionService } from '../../../services/region';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';

@Component({
  selector: 'app-admin-create-destination',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SharedMapComponent],
  templateUrl: './destination-create.component.html',
  styleUrls: ['./destination-create.component.css']
})
export class AdminCreateDestinationComponent implements OnInit, OnDestroy {
  private readonly destinationService = inject(DestinationService);
  private readonly regionService = inject(RegionService);
  private readonly router = inject(Router);

  isSubmitting = false;
  isLoadingRegions = true;
  errorMessage = '';
  draftSavedMessage = '';
  showPinEditor = false;
  private savedDestinationId: number | null = null;

  regions: RegionDto[] = [];

  fullDescription = '';
  categoryInput = '';
  categories: string[] = [];
  managerSearch = '';

  imageFiles: File[] = [];
  imagePreviews: string[] = [];

  form: CreateDestinationDto = {
    name: '',
    description: '',
    destinationTypeId: 1,
    regionId: undefined,
    latitude: undefined,
    longitude: undefined,
    isActive: true
  };

  ngOnDestroy(): void {
    this.imagePreviews.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  ngOnInit(): void {
    this.regionService
      .getAll(true)
      .pipe(finalize(() => (this.isLoadingRegions = false)))
      .subscribe({
        next: (regions: RegionDto[]) => {
          this.regions = [...regions].sort((a, b) => a.name.localeCompare(b.name));
        },
        error: () => {
          this.errorMessage =
            'Could not load regions. You can still create a destination without a region.';
        }
      });
  }

  get mapLat(): number {
    const v = Number(this.form.latitude);
    return Number.isFinite(v) ? v : 42.424;
  }

  get mapLng(): number {
    const v = Number(this.form.longitude);
    return Number.isFinite(v) ? v : 18.771;
  }

  get selectedRegion(): RegionDto | undefined {
    const id = this.form.regionId;
    if (id == null) {
      return undefined;
    }
    return this.regions.find((r) => r.id === id);
  }

  get regionDisplayName(): string {
    return this.selectedRegion?.name ?? '—';
  }

  get coordinatesDisplay(): string {
    const lat = this.form.latitude;
    const lng = this.form.longitude;
    if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return 'Set latitude and longitude';
    }
    const ns = Number(lat) >= 0 ? 'N' : 'S';
    const ew = Number(lng) >= 0 ? 'E' : 'W';
    return `${Math.abs(Number(lat)).toFixed(4)}° ${ns}, ${Math.abs(Number(lng)).toFixed(4)}° ${ew}`;
  }

  get mapPopupText(): string {
    return this.form.name?.trim() || 'New destination';
  }

  onRegionChange(): void {
    const r = this.selectedRegion;
    if (r?.centerLatitude != null && r?.centerLongitude != null) {
      this.form.latitude = Number(r.centerLatitude);
      this.form.longitude = Number(r.centerLongitude);
    }
  }

  togglePinEditor(): void {
    this.showPinEditor = !this.showPinEditor;
  }

  addCategory(): void {
    const next = this.categoryInput.trim();
    if (!next) {
      return;
    }
    this.categories = [...this.categories, next];
    this.categoryInput = '';
  }

  removeCategory(index: number): void {
    this.categories = this.categories.filter((_, i) => i !== index);
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) {
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.imageFiles.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    }
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    const url = this.imagePreviews[index];
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this.imagePreviews = this.imagePreviews.filter((_, i) => i !== index);
    this.imageFiles = this.imageFiles.filter((_, i) => i !== index);
  }

  private buildDescriptionPayload(): string | undefined {
    const text = this.fullDescription.trim();
    return text || undefined;
  }

  private validateBasics(): boolean {
    if (!this.form.name.trim()) {
      this.errorMessage = 'Destination name is required.';
      return false;
    }
    this.errorMessage = '';
    return true;
  }

  onSaveDraft(): void {
    if (!this.validateBasics() || this.isSubmitting) {
      return;
    }
    this.persist(false);
  }

  onSubmit(): void {
    if (!this.validateBasics() || this.isSubmitting) {
      return;
    }
    this.persist(true);
  }

  private persist(published: boolean): void {
    this.isSubmitting = true;
    this.draftSavedMessage = '';

    const createPayload: CreateDestinationDto = {
      name: this.form.name.trim(),
      description: this.buildDescriptionPayload(),
      destinationTypeId: Number(this.form.destinationTypeId),
      regionId: this.form.regionId ? Number(this.form.regionId) : undefined,
      latitude: this.form.latitude != null ? Number(this.form.latitude) : undefined,
      longitude: this.form.longitude != null ? Number(this.form.longitude) : undefined,
      isActive: published
    };

    const updatePayload: UpdateDestinationDto = {
      name: createPayload.name,
      description: createPayload.description,
      destinationTypeId: createPayload.destinationTypeId,
      regionId: createPayload.regionId,
      latitude: createPayload.latitude,
      longitude: createPayload.longitude,
      isActive: createPayload.isActive
    };

    const request$ =
      this.savedDestinationId != null
        ? this.destinationService.update(this.savedDestinationId, updatePayload)
        : this.destinationService.create(createPayload);

    request$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: (saved: DestinationDto) => {
        this.savedDestinationId = saved.id;
        if (published) {
          this.router.navigate(['/admin/destinations']);
          return;
        }
        this.form.isActive = false;
        this.draftSavedMessage = 'Draft saved to the server';
      },
      error: () => {
        this.errorMessage = 'Save failed. Please check fields and try again.';
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/destinations']);
  }
}
