import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { DestinationService } from '../../../../services/destination.service';
import { CreateLocalityDto, LocalityImageDto, LocalityService, UpdateLocalityDto } from '../../../../services/locality.service';
import { MapComponent as SharedMapComponent } from '../../../../shared/components/map/map';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../services/translation.service';

interface LocalityTypeOption {
  id: number;
  name: string;
}

interface DestinationOption {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-manager-locality-create',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, TranslatePipe],
  templateUrl: './locality-create.component.html',
  styleUrls: [
    './locality-create.component.css',
    '../../../admin/shared/admin-page-title.css',
    '../../shared/manager-list-page-header.css',
    '../../shared/manager-list-page-responsive.css',
    '../../../shared/location-sidebar.css'
  ]
})
export class ManagerLocalityCreateComponent implements OnInit, OnDestroy {
  private readonly localityService = inject(LocalityService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly translationService = inject(TranslationService);

  isSubmitting = false;
  isLoadingOptions = true;
  isLoadingDestinations = true;
  isLoadingLocalityTypes = true;
  errorMessage = '';
  galleryErrorMessage = '';
  showTipsModal = false;
  showDeleteConfirmModal = false;
  showDeleteSuccessModal = false;
  isDeleting = false;
  private deleteRedirectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly maxImageCount = 8;

  destinationOptions: DestinationOption[] = [];
  localityTypeOptions: LocalityTypeOption[] = [];
  pendingImageNames = '';
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  existingImages: LocalityImageDto[] = [];
  primaryImageIndex = 0;
  isEditMode = false;
  private localityId: number | null = null;

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
    const idParam = this.route.snapshot.paramMap.get('id');
    const parsedId = idParam ? Number(idParam) : NaN;
    this.isEditMode = Number.isInteger(parsedId) && parsedId > 0;
    this.localityId = this.isEditMode ? parsedId : null;

    this.loadOptions();

    if (this.isEditMode && this.localityId) {
      this.loadLocalityForEdit(this.localityId);
    }
  }

  ngOnDestroy(): void {
    this.imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    if (this.deleteRedirectTimeoutId) {
      clearTimeout(this.deleteRedirectTimeoutId);
      this.deleteRedirectTimeoutId = null;
    }
  }

  get latitudeDirection(): 'N' | 'S' {
    const lat = Number(this.form.latitude);
    return Number.isFinite(lat) && lat < 0 ? 'S' : 'N';
  }

  get longitudeDirection(): 'E' | 'W' {
    const lng = Number(this.form.longitude);
    return Number.isFinite(lng) && lng < 0 ? 'W' : 'E';
  }

  onMapLocationSelected(event: { lat: number; lng: number }): void {
    this.form.latitude = event.lat;
    this.form.longitude = event.lng;
    this.cdr.detectChanges();
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
    const typeName =
      this.localityTypeOptions.find((option) => option.id === Number(this.form.localityTypeId))?.name ?? '';

    if (destinationName && typeName) {
      return `${typeName} · ${destinationName}`;
    }
    if (destinationName) {
      return this.translationService.translate('manager.localityForm.locationSummary.destination', { destination: destinationName });
    }
    if (typeName) {
      return this.translationService.translate('manager.localityForm.locationSummary.type', { type: typeName });
    }
    return this.translationService.translate('manager.localityForm.locationSummary.empty');
  }

  get mapPopupText(): string {
    const destinationName =
      this.destinationOptions.find((option) => option.id === Number(this.form.destinationId))?.name ?? '';
    const typeName =
      this.localityTypeOptions.find((option) => option.id === Number(this.form.localityTypeId))?.name ?? '';
    const name = this.form.name?.trim() ?? '';

    if (name && destinationName) {
      return `${name} · ${destinationName}`;
    }
    if (typeName && destinationName) {
      return `${typeName} · ${destinationName}`;
    }
    return name || typeName || destinationName || this.translationService.translate('manager.localityForm.newLocality');
  }

  get singleDestinationName(): string | null {
    if (this.destinationOptions.length === 1) {
      return this.destinationOptions[0].name;
    }
    return null;
  }

  get hasAnyGalleryImages(): boolean {
    return this.existingImages.length > 0 || this.imagePreviews.length > 0;
  }

  onSubmit(): void {
    if (this.isSubmitting || this.isLoadingOptions) {
      return;
    }

    if (!this.form.name.trim() || !this.form.destinationId || !this.form.localityTypeId) {
      this.errorMessage = this.translationService.translate('manager.localityForm.errors.requiredFields');
      return;
    }
    if (this.existingImages.length === 0 && this.imageFiles.length === 0) {
      this.galleryErrorMessage = this.translationService.translate('manager.localityForm.errors.imageRequired');
      return;
    }
    if (this.existingImages.length + this.imageFiles.length > this.maxImageCount) {
      this.errorMessage = this.translationService.translate('manager.localityForm.errors.maxImages', { count: this.maxImageCount });
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

    const onSuccess = (savedId: number): void => {
      if (!this.imageFiles.length) {
        this.isSubmitting = false;
        this.router.navigate(['/manager/localities']);
        return;
      }

      this.localityService
        .attachImages(savedId, this.imageFiles, this.primaryImageIndex)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.router.navigate(['/manager/localities']);
          },
          error: () => {
            this.router.navigate(['/manager/localities']);
          }
        });
    };

    if (this.isEditMode && this.localityId) {
      const updatePayload: UpdateLocalityDto = payload;
      this.localityService.update(this.localityId, updatePayload).subscribe({
        next: (updated) => onSuccess(updated.id),
        error: (error) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('manager.localityForm.errors.updateFailed');
          this.isSubmitting = false;
        }
      });
      return;
    }

    this.localityService.create(payload).subscribe({
      next: (created) => onSuccess(created.id),
      error: (error) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('manager.localityForm.errors.createFailed');
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/manager/localities']);
  }

  onDeleteLocation(): void {
    if (!this.isEditMode || !this.localityId || this.isDeleting || this.isSubmitting) {
      return;
    }

    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal(): void {
    if (this.isDeleting) {
      return;
    }

    this.showDeleteConfirmModal = false;
  }

  confirmDeleteLocation(): void {
    if (!this.isEditMode || !this.localityId || this.isDeleting || this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isDeleting = true;
    this.showDeleteConfirmModal = false;

    this.localityService.delete(this.localityId).subscribe({
      next: () => {
        this.showDeleteSuccessModal = true;
        this.isDeleting = false;
        this.deleteRedirectTimeoutId = setTimeout(() => {
          this.showDeleteSuccessModal = false;
          this.router.navigate(['/manager/localities']);
        }, 1800);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('manager.localityForm.errors.deleteFailed');
        this.isDeleting = false;
      }
    });
  }

  openTipsModal(): void {
    this.showTipsModal = true;
  }

  closeTipsModal(): void {
    this.showTipsModal = false;
  }

  onPickImages(input: HTMLInputElement): void {
    input.click();
  }

  onDestinationChange(): void {
    const selectedDestination = this.destinationOptions.find(
      (option) => option.id === Number(this.form.destinationId)
    );

    if (!selectedDestination) {
      return;
    }

    if (
      selectedDestination.latitude != null &&
      selectedDestination.longitude != null
    ) {
      this.form.latitude = selectedDestination.latitude;
      this.form.longitude = selectedDestination.longitude;
    }
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

    const remainingSlots = this.maxImageCount - (this.existingImages.length + this.imageFiles.length);
    if (remainingSlots <= 0) {
      this.galleryErrorMessage = this.translationService.translate('manager.localityForm.errors.uploadLimit', { count: this.maxImageCount });
      input.value = '';
      return;
    }

    const acceptedFiles = imageFiles.slice(0, remainingSlots);
    for (const file of acceptedFiles) {
      this.imageFiles.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    }

    this.errorMessage =
      acceptedFiles.length < imageFiles.length
        ? this.translationService.translate('manager.localityForm.errors.partialUpload', { accepted: acceptedFiles.length, count: this.maxImageCount })
        : '';
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
    this.isLoadingDestinations = true;
    this.isLoadingLocalityTypes = true;

    this.destinationService
      .getAll({ page: 1, pageSize: 50, sortBy: 'name', sortOrder: 'asc' })
      .subscribe({
        next: (destResponse: unknown) => {
          const destinationsRaw = Array.isArray(destResponse)
            ? destResponse
            : (destResponse as { items?: unknown[] })?.items ?? [];
          const destinations = destinationsRaw as Array<{ id?: number; name?: string; latitude?: number; longitude?: number }>;

          this.destinationOptions = destinations
            .filter((d): d is { id: number; name: string; latitude?: number; longitude?: number } => typeof d.id === 'number' && !!d.name)
            .map((d) => ({
              id: d.id,
              name: d.name,
              latitude: typeof d.latitude === 'number' ? d.latitude : undefined,
              longitude: typeof d.longitude === 'number' ? d.longitude : undefined
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          if (this.destinationOptions.length > 0) {
            const hasCurrentDestination = this.destinationOptions.some(
              (option) => option.id === Number(this.form.destinationId)
            );

            if (!hasCurrentDestination) {
              this.form.destinationId = this.destinationOptions[0].id;
            }
            this.onDestinationChange();
            this.cdr.detectChanges();
          }

          this.isLoadingDestinations = false;
          this.isLoadingOptions = this.isLoadingDestinations || this.isLoadingLocalityTypes;
        },
        error: () => {
          this.destinationOptions = [];
          this.isLoadingDestinations = false;
          this.isLoadingOptions = this.isLoadingDestinations || this.isLoadingLocalityTypes;
        }
      });

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

        const hasCurrentType = this.localityTypeOptions.some(
          (option) => option.id === Number(this.form.localityTypeId)
        );
        if (!hasCurrentType) {
          this.form.localityTypeId = 0;
        }

        this.isLoadingLocalityTypes = false;
        this.isLoadingOptions = this.isLoadingDestinations || this.isLoadingLocalityTypes;
        this.cdr.detectChanges();
      },
      error: () => {
        this.localityTypeOptions = [];
        this.isLoadingLocalityTypes = false;
        this.isLoadingOptions = this.isLoadingDestinations || this.isLoadingLocalityTypes;
        this.cdr.detectChanges();
      }
    });
  }

  private loadLocalityForEdit(id: number): void {
    this.localityService.getById(id).subscribe({
      next: (locality) => {
        this.form = {
          ...this.form,
          name: locality.name ?? '',
          description: locality.description ?? '',
          destinationId: Number(locality.destinationId) || 0,
          localityTypeId: Number(locality.localityTypeId) || 0,
          latitude: locality.latitude,
          longitude: locality.longitude
        };
        this.loadExistingImages(id);
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('manager.localityForm.errors.loadEditFailed');
      }
    });
  }

  private loadExistingImages(localityId: number): void {
    this.localityService
      .getImages(localityId)
      .pipe(catchError(() => of([])))
      .subscribe((images) => {
        this.existingImages = (images ?? [])
          .filter((image) => !!image?.url)
          .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.id - b.id);
        this.cdr.detectChanges();
      });
  }

}
