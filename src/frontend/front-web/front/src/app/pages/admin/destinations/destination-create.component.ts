import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import {
  AdminUserListItemDto,
  AdminUsersService
} from '../../../services/admin-users.service';
import {
  CreateDestinationDto,
  DestinationDto,
  DestinationImageDto,
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
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('managerCombo') managerComboRef?: ElementRef<HTMLElement>;

  private readonly destroy$ = new Subject<void>();
  private readonly managerSearchInput$ = new Subject<string>();

  isSubmitting = false;
  isLoadingRegions = true;
  errorMessage = '';
  draftSavedMessage = '';
  showPinEditor = false;
  private savedDestinationId: number | null = null;
  editDestinationId: number | null = null;
  isLoadingDestination = false;
  private readonly navigationState = (this.router.getCurrentNavigation()?.extras?.state ??
    history.state ??
    {}) as { linkedEntityCounts?: { objects?: number; localities?: number } };

  regions: RegionDto[] = [];

  fullDescription = '';
  categoryInput = '';
  categories: string[] = [];
  managerSearch = '';
  managerSuggestions: AdminUserListItemDto[] = [];
  managerSuggestionsOpen = false;
  managerSuggestionsLoading = false;
  selectedManager: AdminUserListItemDto | null = null;

  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  destinationImages: DestinationImageDto[] = [];
  isUpdatingImages = false;
  isLoadingLinkedEntities = false;
  linkedEntityCounts = {
    objects: 0,
    events: 0,
    activities: 0,
    localities: 0
  };

  form: CreateDestinationDto = {
    name: '',
    description: '',
    destinationTypeId: 1,
    regionId: undefined,
    latitude: undefined,
    longitude: undefined,
    isActive: true
  };

  get isEditMode(): boolean {
    return this.editDestinationId != null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.imagePreviews.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const root = this.managerComboRef?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.managerSuggestionsOpen = false;
    }
  }

  ngOnInit(): void {
    const fromState = this.navigationState.linkedEntityCounts;
    if (fromState) {
      this.linkedEntityCounts.objects = Number(fromState.objects ?? 0);
      this.linkedEntityCounts.localities = Number(fromState.localities ?? 0);
    }

    const rawId = this.route.snapshot.paramMap.get('id');
    const parsedId = rawId ? Number(rawId) : NaN;
    if (Number.isInteger(parsedId) && parsedId > 0) {
      this.editDestinationId = parsedId;
      this.savedDestinationId = parsedId;
      this.isLoadingDestination = true;
      this.errorMessage = '';
    }

    const regionRequest$ = this.regionService.getAll(true).pipe(
      catchError(() => {
        this.errorMessage = 'Could not load regions. You can still create a destination without a region.';
        return of([] as RegionDto[]);
      })
    );

    const destinationRequest$ =
      this.editDestinationId != null
        ? forkJoin({
            destination: this.destinationService.getById(this.editDestinationId),
            images: this.destinationService.getImages(this.editDestinationId).pipe(
              catchError(() => of([] as DestinationImageDto[]))
            )
          }).pipe(
            catchError(() => {
              this.errorMessage = 'Could not load destination for editing.';
              return of(null);
            })
          )
        : of(null);

    forkJoin({ regions: regionRequest$, destination: destinationRequest$ })
      .pipe(
        finalize(() => {
          this.isLoadingRegions = false;
          this.isLoadingDestination = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe(({ regions, destination }) => {
        this.regions = [...regions].sort((a, b) => a.name.localeCompare(b.name));
        if (destination) {
          this.applyLoadedDestination(destination.destination, destination.images);
        }
        this.cdr.detectChanges();
      });

    this.managerSearchInput$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap((term) => {
          if (!term.trim()) {
            this.managerSuggestions = [];
            this.managerSuggestionsLoading = false;
            this.managerSuggestionsOpen = false;
          }
        }),
        switchMap((term) => {
          const q = term.trim();
          if (!q) {
            return of(null);
          }
          this.managerSuggestionsLoading = true;
          return this.adminUsersService.searchManagers(q).pipe(
            finalize(() => (this.managerSuggestionsLoading = false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((page) => {
        if (!page) {
          return;
        }
        const skipId = this.selectedManager?.id;
        this.managerSuggestions = page.items.filter((u) => u.id !== skipId);
        this.managerSuggestionsOpen = true;
        this.cdr.detectChanges();
      });
  }

  private applyLoadedDestination(destination: DestinationDto, images: DestinationImageDto[]): void {
    this.form = {
      name: destination.name ?? '',
      description: destination.description,
      destinationTypeId: destination.destinationTypeId ?? 1,
      regionId: destination.regionId,
      latitude: destination.latitude,
      longitude: destination.longitude,
      isActive: Boolean(destination.isActive)
    };
    this.fullDescription = destination.description ?? '';
    this.destinationImages = [...images].sort((a, b) => (a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1));

    if (destination.managedByUserId) {
      this.adminUsersService.searchManagers('', 200).subscribe({
        next: (res) => {
          const manager = res.items.find((u) => u.id === destination.managedByUserId) ?? null;
          this.selectedManager = manager;
          this.cdr.detectChanges();
        }
      });
    }
  }


  setPrimaryDestinationImage(image: DestinationImageDto): void {
    if (!this.isEditMode || this.isUpdatingImages || !image?.id) {
      return;
    }

    this.isUpdatingImages = true;
    this.destinationService
      .setMainImage(image.id)
      .pipe(finalize(() => (this.isUpdatingImages = false)))
      .subscribe({
        next: () => {
          this.destinationImages = this.destinationImages
            .map((img) => ({ ...img, isMain: img.id === image.id }))
            .sort((a, b) => (a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1));
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = this.extractApiErrorMessage(err);
          this.cdr.detectChanges();
        }
      });
  }

  removeDestinationImage(image: DestinationImageDto): void {
    if (!this.isEditMode || this.isUpdatingImages || !image?.id) {
      return;
    }

    this.isUpdatingImages = true;
    this.destinationService
      .deleteImageById(image.id)
      .pipe(finalize(() => (this.isUpdatingImages = false)))
      .subscribe({
        next: () => {
          this.destinationImages = this.destinationImages.filter((img) => img.id !== image.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = this.extractApiErrorMessage(err);
          this.cdr.detectChanges();
        }
      });
  }

  onManagerSearchInput(value: string): void {
    this.managerSearchInput$.next(value);
  }

  onManagerSearchFocus(): void {
    const q = this.managerSearch.trim();
    if (q.length > 0) {
      this.managerSearchInput$.next(this.managerSearch);
    }
  }

  selectManager(user: AdminUserListItemDto): void {
    this.selectedManager = user;
    this.managerSearch = '';
    this.managerSuggestions = [];
    this.managerSuggestionsOpen = false;
  }

  clearSelectedManager(): void {
    this.selectedManager = null;
  }

  displayName(user: AdminUserListItemDto): string {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  managerInitials(user: AdminUserListItemDto): string {
    const a = user.firstName?.charAt(0) ?? '';
    const b = user.lastName?.charAt(0) ?? '';
    const s = `${a}${b}`.toUpperCase();
    return s || user.email.charAt(0).toUpperCase();
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
    if (!this.selectedManager && this.savedDestinationId == null) {
      this.errorMessage = 'Please select a manager.';
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
      isActive: published,
      managedByUserId: this.selectedManager?.id
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

    const isCreateRequest = this.savedDestinationId == null;
    const request$ =
      !isCreateRequest
        ? this.destinationService.update(this.savedDestinationId!, updatePayload)
        : this.destinationService.create(createPayload);

    request$
      .pipe(
        switchMap((saved: DestinationDto) => {
          this.savedDestinationId = saved.id;
          if (!this.selectedManager) {
            return of({ assigned: true as const });
          }
          if (isCreateRequest) {
            return this.destinationService.assignManager(saved.id, this.selectedManager.id).pipe(
              map(() => ({ assigned: true as const })),
              catchError((err) =>
                of({
                  assigned: false as const,
                  assignError:
                    typeof err?.error?.message === 'string'
                      ? err.error.message
                      : 'Destination was saved, but assigning the manager failed.'
                })
              )
            );
          }
          return this.destinationService.assignManager(saved.id, this.selectedManager.id).pipe(
            map(() => ({ assigned: true as const })),
            catchError((err) =>
              of({
                assigned: false as const,
                assignError:
                  typeof err?.error?.message === 'string'
                    ? err.error.message
                    : 'Destination was saved, but assigning the manager failed.'
              })
            )
          );
        }),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: (out) => {
          if (!out.assigned) {
            if (published) {
              this.router.navigate(['/admin/destinations']);
              return;
            }
            this.errorMessage = out.assignError;
            this.draftSavedMessage =
              'Draft saved to the server. You can fix manager assignment and save again.';
            return;
          }
          if (published) {
            this.router.navigate(['/admin/destinations']);
            return;
          }
          this.form.isActive = false;
          this.draftSavedMessage = 'Draft saved to the server';
        },
        error: (err) => {
          this.errorMessage = this.extractApiErrorMessage(err);
        }
      });
  }

  private extractApiErrorMessage(err: unknown): string {
    const maybeError = err as {
      error?: { message?: string; errors?: Record<string, string[]> | string[] };
    };
    const direct = maybeError?.error?.message;
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return direct;
    }
    const validation = maybeError?.error?.errors;
    if (Array.isArray(validation) && validation.length) {
      return validation[0];
    }
    if (validation && typeof validation === 'object') {
      const validationMap = validation as Record<string, string[]>;
      const firstKey = Object.keys(validationMap)[0];
      const firstValue = firstKey ? validationMap[firstKey] : undefined;
      if (Array.isArray(firstValue) && firstValue.length) {
        return firstValue[0];
      }
    }
    return 'Save failed. Please check fields and try again.';
  }

  onCancel(): void {
    this.router.navigate(['/admin/destinations']);
  }
}
