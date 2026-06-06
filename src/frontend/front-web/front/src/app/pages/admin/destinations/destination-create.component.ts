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
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, forkJoin, from, of } from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
  toArray
} from 'rxjs/operators';
import {
  AdminUserListItemDto,
  AdminUsersService
} from '../../../services/admin-users.service';
import {
  CreateDestinationDto,
  DestinationEditLockDto,
  DestinationDto,
  DestinationImageDto,
  DestinationService,
  UpdateDestinationDto
} from '../../../services/destination.service';
import { RegionDto, RegionService } from '../../../services/region';
import { TranslationService } from '../../../services/translation.service';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-create-destination',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SharedMapComponent, TranslatePipe],
  templateUrl: './destination-create.component.html',
  styleUrls: ['./destination-create.component.css', '../shared/admin-page-title.css']
})
export class AdminCreateDestinationComponent implements OnInit, OnDestroy {
  private readonly destinationService = inject(DestinationService);
  private readonly regionService = inject(RegionService);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);

  @ViewChild('managerCombo') managerComboRef?: ElementRef<HTMLElement>;

  private readonly destroy$ = new Subject<void>();
  private readonly managerSearchInput$ = new Subject<string>();
  private readonly destinationNameInput$ = new Subject<string>();
  private readonly managerSuggestionPageSize = 50;
  private isHydratingForm = false;

  isSubmitting = false;
  isDeleting = false;
  showDeleteConfirmModal = false;
  isLoadingRegions = true;
  errorMessage = '';
  galleryErrorMessage = '';
  editLockState: DestinationEditLockDto | null = null;
  isEditBlocked = false;
  private savedDestinationId: number | null = null;
  editDestinationId: number | null = null;
  isLoadingDestination = false;
  private editLockHeartbeatId: number | null = null;
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
  managerErrorMessage = '';
  private managerAssignments = new Map<number, { destinationId: number; destinationName: string }>();
  private managerAssignmentsLoaded = false;
  locationLookupState: 'idle' | 'loading' | 'resolved' | 'not_found' | 'error' = 'idle';
  locationLookupMessage = '';

  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  primaryPreviewImageIndex: number | null = 0;
  destinationImages: DestinationImageDto[] = [];
  isUpdatingImages = false;
  isLoadingLinkedEntities = false;
  linkedEntityCounts = {
    objects: 0,
    events: 0,
    activities: 0,
    localities: 0
  };
  private readonly maxImageCount = 8;

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

  get editLockDisplayMessage(): string {
    if (!this.editLockState || !this.isEditBlocked) {
      return '';
    }

    const lockedBy = this.editLockState.lockedByDisplayName?.trim() || this.t('adminDestinationForm.anotherAdmin');
    const expiresAt = this.editLockState.expiresAtUtc
      ? this.formatUtcForDisplay(this.editLockState.expiresAtUtc)
      : this.t('adminDestinationForm.currentEditSessionEnds');

    return this.t('adminDestinationForm.editLockedMessage', { lockedBy, expiresAt });
  }

  ngOnDestroy(): void {
    this.stopEditLockHeartbeat();
    this.releaseOwnedEditLock();
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
    this.scrollPageToTop();
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
        this.errorMessage = this.t('adminDestinationForm.errors.loadRegions');
        return of([] as RegionDto[]);
      })
    );

    const destinationRequest$ =
      this.editDestinationId != null
        ? forkJoin({
            destination: this.destinationService.getById(this.editDestinationId),
            images: this.destinationService.getImages(this.editDestinationId).pipe(
              catchError(() => of([] as DestinationImageDto[]))
            ),
            editLock: this.destinationService.acquireEditLock(this.editDestinationId).pipe(
              catchError((err) =>
                of({
                  destinationId: this.editDestinationId!,
                  isLocked: true,
                  isOwnedByCurrentUser: false,
                  message: this.extractApiErrorMessage(err) || this.t('adminDestinationForm.errors.startEditSession')
                } as DestinationEditLockDto)
              )
            )
          }).pipe(
            catchError(() => {
              this.errorMessage = this.t('adminDestinationForm.errors.loadDestination');
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
          this.applyEditLockState(destination.editLock);
        }
        this.cdr.detectChanges();
        this.scrollPageToTop();
      });

    this.loadManagerAssignments();

    this.managerSearchInput$
      .pipe(
        switchMap((term) => {
          const q = term.trim();
          this.managerSuggestionsOpen = true;
          this.managerSuggestionsLoading = true;
          this.cdr.detectChanges();

          return this.adminUsersService.searchManagers(q, this.managerSuggestionPageSize).pipe(
            catchError(() =>
              of({
                items: [] as AdminUserListItemDto[],
                page: 1,
                pageSize: this.managerSuggestionPageSize,
                totalCount: 0,
                totalPages: 0
              })
            ),
            finalize(() => {
              this.managerSuggestionsLoading = false;
              this.cdr.detectChanges();
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((page) => {
        this.managerSuggestions = this.filterManagerSuggestions(page.items, this.managerSearch);
        this.managerSuggestionsOpen = true;
        this.cdr.detectChanges();
      });

    this.destinationNameInput$
      .pipe(
        debounceTime(650),
        distinctUntilChanged(),
        tap((name) => {
          const query = name.trim();
          if (!query || query.length < 2) {
            this.locationLookupState = 'idle';
            this.locationLookupMessage = '';
            return;
          }
          this.locationLookupState = 'loading';
          this.locationLookupMessage = this.t('adminDestinationForm.locationLookup.searching');
        }),
        switchMap((name) => this.lookupCoordinatesByName(name)),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        if (result.kind === 'resolved') {
          this.form.latitude = Number(result.lat.toFixed(6));
          this.form.longitude = Number(result.lng.toFixed(6));
          this.locationLookupState = 'resolved';
          this.locationLookupMessage = this.t('adminDestinationForm.locationLookup.matched', { label: result.label });
        } else if (result.kind === 'not_found') {
          this.locationLookupState = 'not_found';
          this.locationLookupMessage = this.t('adminDestinationForm.locationLookup.notFound');
        } else {
          this.locationLookupState = 'error';
          this.locationLookupMessage = this.t('adminDestinationForm.locationLookup.unavailable');
        }
        this.cdr.detectChanges();
      });
  }

  private applyLoadedDestination(destination: DestinationDto, images: DestinationImageDto[]): void {
    this.isHydratingForm = true;
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
    this.primaryPreviewImageIndex = this.destinationImages.length > 0 ? null : 0;

    if (destination.managedByUserId) {
      this.adminUsersService.getUserById(destination.managedByUserId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (user) => {
          this.selectedManager = {
            id: Number(user.id ?? destination.managedByUserId),
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            email: user.email ?? '',
            roleName: user.roleName ?? user.role ?? this.t('adminDestinationForm.managerRoleFallback'),
            profileImageUrl: user.profileImageUrl ?? null,
            country: user.country ?? null,
            isActive: user.isActive,
            createdAt: user.createdAt,
            isBanned: user.isBanned,
            banReason: user.banReason ?? null,
            banExpiresAtUtc: user.banExpiresAtUtc ?? null,
            bannedAtUtc: user.bannedAtUtc ?? null,
            hasActiveSession: user.hasActiveSession,
            activeSessionExpiresAtUtc: user.activeSessionExpiresAtUtc ?? null,
            editLock: user.editLock ?? null
          };
          this.cdr.detectChanges();
        },
        error: () => {
          this.selectedManager = null;
          this.cdr.detectChanges();
        }
      });
    }
    this.isHydratingForm = false;
  }

  private applyEditLockState(lockState: DestinationEditLockDto | null): void {
    this.editLockState = lockState;
    this.isEditBlocked = Boolean(lockState?.isLocked && !lockState.isOwnedByCurrentUser);

    if (lockState?.isOwnedByCurrentUser) {
      this.startEditLockHeartbeat();
    } else {
      this.stopEditLockHeartbeat();
    }
  }

  private startEditLockHeartbeat(): void {
    if (this.editLockHeartbeatId != null || this.editDestinationId == null) {
      return;
    }

    this.editLockHeartbeatId = window.setInterval(() => {
      if (this.editDestinationId == null) {
        return;
      }

      this.destinationService.refreshEditLock(this.editDestinationId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (lockState) => {
          this.applyEditLockState(lockState);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.applyEditLockState({
            destinationId: this.editDestinationId!,
            isLocked: true,
            isOwnedByCurrentUser: false,
            message: this.extractApiErrorMessage(err) || this.t('adminDestinationForm.errors.keepEditSession')
          });
          this.cdr.detectChanges();
        }
      });
    }, 60000);
  }

  private stopEditLockHeartbeat(): void {
    if (this.editLockHeartbeatId == null) {
      return;
    }

    window.clearInterval(this.editLockHeartbeatId);
    this.editLockHeartbeatId = null;
  }

  private releaseOwnedEditLock(): void {
    if (!this.editDestinationId || !this.editLockState?.isOwnedByCurrentUser) {
      return;
    }

    this.destinationService.releaseEditLock(this.editDestinationId).subscribe({
      error: () => {
        // Best effort release on page exit.
      }
    });
  }

  private formatUtcForDisplay(isoValue: string): string {
    const parsed = new Date(isoValue);
    if (Number.isNaN(parsed.getTime())) {
      return this.t('adminDestinationForm.currentEditSessionEnds');
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed);
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
          if (!this.destinationImages.length && this.imagePreviews.length > 0 && this.primaryPreviewImageIndex == null) {
            this.primaryPreviewImageIndex = 0;
          }
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
    this.managerSuggestionsOpen = true;
    this.managerSearchInput$.next(this.managerSearch);
  }

  private loadManagerAssignments(): void {
    if (this.managerAssignmentsLoaded) {
      return;
    }
    this.destinationService
      .getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .pipe(
        catchError(() => of([] as DestinationDto[])),
        takeUntil(this.destroy$)
      )
      .subscribe((destinations) => {
        this.managerAssignmentsLoaded = true;
        this.managerAssignments.clear();
        for (const destination of destinations) {
          const managerId = destination.managedByUserId;
          if (managerId == null) {
            continue;
          }
          this.managerAssignments.set(managerId, {
            destinationId: destination.id,
            destinationName: destination.name
          });
        }
        this.cdr.detectChanges();
      });
  }

  private validateManagerAssignment(user: AdminUserListItemDto): string | null {
    const assignment = this.managerAssignments.get(user.id);
    if (!assignment) {
      return null;
    }

    if (this.isEditMode && assignment.destinationId === this.editDestinationId) {
      return null;
    }

    return this.t('adminDestinationForm.errors.managerAlreadyAssigned', {
      destination: assignment.destinationName
    });
  }

  private setManagerError(message: string): void {
    this.managerErrorMessage = message;
    this.errorMessage = message;
    this.cdr.detectChanges();
    this.scrollPageToTop();
  }

  private showFormError(message: string): void {
    this.errorMessage = message;
    this.managerErrorMessage = '';
    this.cdr.detectChanges();
    this.scrollPageToTop();
  }

  private clearManagerError(): void {
    if (!this.managerErrorMessage) {
      return;
    }
    const previousMessage = this.managerErrorMessage;
    this.managerErrorMessage = '';
    if (this.errorMessage === previousMessage) {
      this.errorMessage = '';
    }
  }

  private filterManagerSuggestions(
    users: AdminUserListItemDto[],
    searchTerm: string
  ): AdminUserListItemDto[] {
    const q = this.normalizeUserSearchValue(searchTerm);
    const skipId = this.selectedManager?.id;
    return users.filter((user) => {
      if (user.id === skipId) {
        return false;
      }

      const name = this.normalizeUserSearchValue(this.displayName(user));
      return !q || name.includes(q);
    });
  }

  private normalizeUserSearchValue(value: string | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  selectManager(user: AdminUserListItemDto): void {
    const managerError = this.validateManagerAssignment(user);
    if (managerError) {
      this.setManagerError(managerError);
      return;
    }

    this.managerErrorMessage = '';
    this.errorMessage = '';
    this.selectedManager = user;
    this.managerSearch = '';
    this.managerSuggestions = [];
    this.managerSuggestionsOpen = false;
    this.cdr.detectChanges();
  }

  clearSelectedManager(): void {
    this.selectedManager = null;
    this.clearManagerError();
    this.cdr.detectChanges();
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
    return this.selectedRegion?.name ?? this.t('adminDestinationForm.notSet');
  }

  get latitudeDirection(): 'N' | 'S' {
    const lat = Number(this.form.latitude);
    if (!Number.isFinite(lat)) {
      return 'N';
    }
    return lat >= 0 ? 'N' : 'S';
  }

  get longitudeDirection(): 'E' | 'W' {
    const lng = Number(this.form.longitude);
    if (!Number.isFinite(lng)) {
      return 'E';
    }
    return lng >= 0 ? 'E' : 'W';
  }

  get coordinatesDisplay(): string {
    const lat = this.form.latitude;
    const lng = this.form.longitude;
    if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return this.t('adminDestinationForm.setLatitudeLongitude');
    }
    const ns = Number(lat) >= 0 ? 'N' : 'S';
    const ew = Number(lng) >= 0 ? 'E' : 'W';
    return `${Math.abs(Number(lat)).toFixed(4)}° ${ns}, ${Math.abs(Number(lng)).toFixed(4)}° ${ew}`;
  }

  get mapPopupText(): string {
    return this.form.name?.trim() || this.t('adminDestinationForm.newDestination');
  }

  onDestinationNameInput(value: string): void {
    if (this.isHydratingForm) {
      return;
    }
    const query = (value ?? '').trim();
    if (!query || query.length < 2) {
      this.locationLookupState = 'idle';
      this.locationLookupMessage = '';
    }
    this.destinationNameInput$.next(value);
  }

  onRegionChange(): void {
    const r = this.selectedRegion;
    if (r?.centerLatitude != null && r?.centerLongitude != null) {
      this.form.latitude = Number(r.centerLatitude);
      this.form.longitude = Number(r.centerLongitude);
    }
    this.onDestinationNameInput(this.form.name?.trim() ?? '');
  }

  onMapLocationSelected(position: { lat: number; lng: number }): void {
    this.form.latitude = Number(position.lat.toFixed(6));
    this.form.longitude = Number(position.lng.toFixed(6));
  }

  private lookupCoordinatesByName(name: string) {
    const query = name.trim();
    if (!query || query.length < 2) {
      return of(null as { kind: 'resolved'; lat: number; lng: number; label: string } | { kind: 'not_found' } | { kind: 'error' } | null);
    }

    const regionName = this.selectedRegion?.name?.trim();
    const queryVariants = this.buildLocationQueryVariants(query);
    const requests = queryVariants.map((variant) => {
      const fullQuery = regionName ? `${variant}, ${regionName}` : variant;
      let params = new HttpParams()
        .set('q', fullQuery)
        .set('format', 'jsonv2')
        .set('limit', '8')
        .set('addressdetails', '1')
        .set('namedetails', '1')
        .set('accept-language', 'sr,en');

      if (this.selectedRegion?.code?.trim()) {
        params = params.set('countrycodes', this.selectedRegion.code.toLowerCase());
      }

      return this.http.get<
        Array<{
          lat: string;
          lon: string;
          class?: string;
          type?: string;
          name?: string;
          display_name?: string;
          address?: Record<string, string | undefined>;
          namedetails?: Record<string, string | undefined>;
        }>
      >('https://nominatim.openstreetmap.org/search', {
        params
      });
    });

    return forkJoin(requests)
      .pipe(
        map((responseGroups) => {
          const allResults = responseGroups.flatMap((group) => group ?? []);
          const acceptable = allResults.find((item) =>
            this.isAcceptableGeocodeResult(queryVariants, item)
          );
          if (!acceptable) {
            return { kind: 'not_found' } as const;
          }
          const lat = Number(acceptable.lat);
          const lng = Number(acceptable.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return { kind: 'not_found' } as const;
          }
          return {
            kind: 'resolved' as const,
            lat,
            lng,
            label: acceptable.display_name?.trim() || query
          };
        }),
        catchError(() => of({ kind: 'error' as const }))
      );
  }

  private buildLocationQueryVariants(query: string): string[] {
    const normalized = this.normalizeLookupValue(query);
    const aliases: Record<string, string[]> = {
      tasos: ['thasos'],
      thasos: ['tasos'],
      roma: ['rome'],
      rome: ['roma'],
      atina: ['athens'],
      athens: ['atina'],
      bec: ['vienna'],
      vienna: ['bec'],
      solun: ['thessaloniki'],
      thessaloniki: ['solun']
    };

    const variants = [query.trim(), ...(aliases[normalized] ?? [])].filter((v) => v.trim().length > 0);
    return Array.from(new Set(variants));
  }

  private normalizeLookupValue(value: string | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isAcceptableGeocodeResult(
    queryVariants: string[],
    item: {
      class?: string;
      type?: string;
      name?: string;
      display_name?: string;
      address?: Record<string, string | undefined>;
      namedetails?: Record<string, string | undefined>;
    }
  ): boolean {
    const normalizedQueries = queryVariants
      .map((q) => this.normalizeLookupValue(q))
      .filter((q) => q.length > 0);
    if (!normalizedQueries.length) {
      return false;
    }

    const itemClass = this.normalizeLookupValue(item.class);
    if (itemClass && itemClass !== 'place' && itemClass !== 'boundary') {
      return false;
    }

    // Keep settlement/admin-like place types and avoid POIs.
    const allowedTypes = new Set([
      'city',
      'town',
      'village',
      'municipality',
      'administrative',
      'hamlet',
      'suburb',
      'island'
    ]);
    const resultType = this.normalizeLookupValue(item.type);
    if (!allowedTypes.has(resultType)) {
      return false;
    }

    const address = item.address ?? {};
    const namedetails = item.namedetails ?? {};
    const candidateNames = [
      item.name,
      item.display_name?.split(',')[0],
      address['city'],
      address['town'],
      address['village'],
      address['municipality'],
      address['county'],
      address['state'],
      address['island'],
      address['city_district'],
      namedetails['name'],
      namedetails['name:en'],
      namedetails['name:sr'],
      namedetails['name:sr-Latn']
    ]
      .map((v) => this.normalizeLookupValue(v))
      .filter((v) => v.length > 0);

    return normalizedQueries.some((q) => candidateNames.includes(q));
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
    const remainingSlots = this.maxImageCount - (this.destinationImages.length + this.imageFiles.length);
    if (remainingSlots <= 0) {
      this.galleryErrorMessage = this.t('adminDestinationForm.errors.maxImages', { count: this.maxImageCount });
      input.value = '';
      return;
    }
    const acceptedCount = Math.min(files.length, remainingSlots);
    for (let i = 0; i < acceptedCount; i++) {
      const file = files[i];
      this.imageFiles.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    }
    if (this.primaryPreviewImageIndex == null && this.destinationImages.length === 0 && this.imagePreviews.length > 0) {
      this.primaryPreviewImageIndex = 0;
    }
    this.errorMessage =
      acceptedCount < files.length
        ? this.t('adminDestinationForm.errors.partialImagesAdded', { acceptedCount, count: this.maxImageCount })
        : '';
    if (
      this.primaryPreviewImageIndex != null &&
      this.primaryPreviewImageIndex >= this.imagePreviews.length
    ) {
      this.primaryPreviewImageIndex = Math.max(0, this.imagePreviews.length - 1);
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
    if (this.imagePreviews.length === 0) {
      this.primaryPreviewImageIndex = this.destinationImages.length === 0 ? 0 : null;
      return;
    }
    if (this.primaryPreviewImageIndex == null) {
      return;
    }
    if (index < this.primaryPreviewImageIndex) {
      this.primaryPreviewImageIndex--;
    } else if (index === this.primaryPreviewImageIndex) {
      this.primaryPreviewImageIndex = 0;
    }
  }

  setPrimaryPreviewImage(index: number): void {
    if (index < 0 || index >= this.imagePreviews.length) {
      return;
    }
    this.primaryPreviewImageIndex = index;
  }

  private buildDescriptionPayload(): string | undefined {
    const text = this.fullDescription.trim();
    return text || undefined;
  }

  private validateBasics(): boolean {
    if (!this.form.name.trim()) {
      this.errorMessage = this.t('adminDestinationForm.errors.destinationNameRequired');
      return false;
    }
    if (this.destinationImages.length === 0 && this.imageFiles.length === 0) {
      this.galleryErrorMessage = this.t('adminDestinationForm.errors.atLeastOneImage');
      return false;
    }
    if (this.destinationImages.length + this.imageFiles.length > this.maxImageCount) {
      this.errorMessage = this.t('adminDestinationForm.errors.maxImagesDestination', { count: this.maxImageCount });
      return false;
    }
    if (!this.selectedManager) {
      this.errorMessage = this.t('adminDestinationForm.errors.selectManager');
      return false;
    }
    const managerError = this.validateManagerAssignment(this.selectedManager);
    if (managerError) {
      this.setManagerError(managerError);
      return false;
    }
    this.errorMessage = '';
    this.managerErrorMessage = '';
    return true;
  }

  onSubmit(): void {
    if (this.isEditBlocked || !this.validateBasics() || this.isSubmitting || this.isDeleting) {
      return;
    }
    this.persist();
  }

  private persist(): void {
    this.isSubmitting = true;

    const createPayload: CreateDestinationDto = {
      name: this.form.name.trim(),
      description: this.buildDescriptionPayload(),
      destinationTypeId: Number(this.form.destinationTypeId),
      regionId: this.form.regionId ? Number(this.form.regionId) : undefined,
      latitude: this.form.latitude != null ? Number(this.form.latitude) : undefined,
      longitude: this.form.longitude != null ? Number(this.form.longitude) : undefined,
      isActive: true,
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
          const assignment$ = !this.selectedManager
            ? of({ assigned: true as const })
            : this.destinationService.assignManager(saved.id, this.selectedManager.id).pipe(
                map(() => ({ assigned: true as const })),
                catchError((err) =>
                  of({
                    assigned: false as const,
                    assignError:
                      typeof err?.error?.message === 'string'
                        ? err.error.message
                        : this.t('adminDestinationForm.errors.assignManagerFailed')
                  })
                )
              );

          return assignment$.pipe(
            switchMap((assignmentResult) =>
              this.uploadPendingImages(saved.id, this.destinationImages.length).pipe(
                map(() => ({
                  ...assignmentResult,
                  imageUploadFailed: false as const
                })),
                catchError(() =>
                  of({
                    ...assignmentResult,
                    imageUploadFailed: true as const
                  })
                )
              )
            )
          );
        }),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (out) => {
          if (!out.assigned) {
            const assignError =
              'assignError' in out && typeof out.assignError === 'string'
                ? out.assignError
                : this.t('adminDestinationForm.errors.assignManagerFailed');
            this.setManagerError(assignError);
            return;
          }
          this.router.navigate(['/admin/destinations']);
        },
        error: (err) => {
          const lockState = this.extractLockState(err);
          if (lockState) {
            this.applyEditLockState(lockState);
            this.errorMessage = '';
            this.managerErrorMessage = '';
            this.cdr.detectChanges();
            return;
          }
          const message = this.extractApiErrorMessage(err);
          if (this.isManagerAssignmentError(err, message)) {
            this.setManagerError(message);
            return;
          }
          this.showFormError(message);
        }
      });
  }

  private uploadPendingImages(
    destinationId: number,
    existingCount: number
  ): Observable<DestinationImageDto[]> {
    if (!this.imageFiles.length) {
      return of([]);
    }

    const originalEntries = this.imageFiles.map((file, index) => ({ file, originalIndex: index }));
    const selectedPrimaryIndex =
      this.primaryPreviewImageIndex != null
        ? this.primaryPreviewImageIndex
        : existingCount === 0 && originalEntries.length > 0
          ? 0
          : null;

    const uploadEntries = [...originalEntries];
    if (existingCount === 0 && selectedPrimaryIndex != null && selectedPrimaryIndex > 0) {
      const [selectedPrimary] = uploadEntries.splice(selectedPrimaryIndex, 1);
      if (selectedPrimary) {
        uploadEntries.unshift(selectedPrimary);
      }
    }

    const uploadedByOriginalIndex = new Map<number, DestinationImageDto>();

    return from(uploadEntries).pipe(
      concatMap((entry, uploadIndex) =>
        this.destinationService.addImage(
          destinationId,
          entry.file,
          existingCount === 0 && uploadIndex === 0
        ).pipe(
          tap((image) => {
            uploadedByOriginalIndex.set(entry.originalIndex, image);
          })
        )
      ),
      toArray(),
      switchMap((uploadedImages) => {
        if (existingCount > 0 && selectedPrimaryIndex != null) {
          const selectedImage = uploadedByOriginalIndex.get(selectedPrimaryIndex);
          if (selectedImage?.id) {
            return this.destinationService.setMainImage(selectedImage.id).pipe(map(() => uploadedImages));
          }
        }

        return of(uploadedImages);
      })
    );
  }

  private resetPendingImages(): void {
    this.imagePreviews.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.imageFiles = [];
    this.imagePreviews = [];
    this.primaryPreviewImageIndex = this.destinationImages.length > 0 ? null : 0;
  }

  private isManagerAssignmentError(err: unknown, message: string): boolean {
    const status = (err as { status?: number })?.status;
    if (status === 422) {
      return true;
    }
    const normalized = message.trim().toLowerCase();
    return (
      normalized.includes('already assigned') ||
      normalized.includes('already manages') ||
      normalized.includes('menadžer već') ||
      normalized.includes('menadzer vec') ||
      normalized.includes('manages only one') ||
      normalized.includes('jedan menadzer') ||
      normalized.includes('jedan menadžer')
    );
  }

  private extractLockState(err: unknown): DestinationEditLockDto | null {
    const maybeError = err as {
      status?: number;
      error?: Partial<DestinationEditLockDto> & { message?: string };
    };

    if (maybeError?.status !== 409 || !maybeError.error) {
      return null;
    }

    const destinationId = Number(maybeError.error.destinationId ?? this.editDestinationId ?? 0);
    return {
      destinationId,
      isLocked: Boolean(maybeError.error.isLocked ?? true),
      isOwnedByCurrentUser: Boolean(maybeError.error.isOwnedByCurrentUser ?? false),
      lockedByUserId: maybeError.error.lockedByUserId,
      lockedByDisplayName: maybeError.error.lockedByDisplayName,
      acquiredAtUtc: maybeError.error.acquiredAtUtc,
      expiresAtUtc: maybeError.error.expiresAtUtc,
      message: typeof maybeError.error.message === 'string' && maybeError.error.message.trim().length > 0
        ? maybeError.error.message
        : this.t('adminDestinationForm.errors.anotherAdminEditing')
    };
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
    return this.t('adminDestinationForm.errors.saveFailed');
  }

  private scrollPageToTop(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Some layouts use custom scroll containers instead of window.
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

  onCancel(): void {
    this.router.navigate(['/admin/destinations']);
  }

  onDeleteDestination(): void {
    if (!this.isEditMode || this.editDestinationId == null || this.isDeleting || this.isSubmitting) {
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

  confirmDeleteDestination(): void {
    if (!this.isEditMode || this.editDestinationId == null || this.isDeleting || this.isSubmitting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.destinationService
      .delete(this.editDestinationId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          this.showDeleteConfirmModal = false;
          this.router.navigate(['/admin/destinations']);
        },
        error: (err) => {
          this.errorMessage = this.extractApiErrorMessage(err);
          this.cdr.detectChanges();
        }
      });
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }
}
