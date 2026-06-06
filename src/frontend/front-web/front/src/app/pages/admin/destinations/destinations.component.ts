import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { AdminUserListItemDto, AdminUsersService } from '../../../services/admin-users.service';
import {
  DestinationDto,
  DestinationEditLockDto,
  DestinationImageDto,
  DestinationService
} from '../../../services/destination.service';
import { LocalityService, LocalityDto } from '../../../services/locality.service';
import { ObjectDto } from '../../../services/object';
import { environment } from '../../../../environment/environment';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';
import { TranslationService } from '../../../services/translation.service';

export interface AdminDestinationRow {
  id: number;
  name: string;
  publicId: string;
  /** Category label in the Type column (pill). */
  destinationType: string;
  region: string;
  country: string;
  code: string;
  /** Mirrors backend DestinationDto.isActive — published vs hidden. */
  isPublished: boolean;
  localityCount: number;
  /** Objects count for the Inventory column (building + "N Objects"). */
  objectCount: number;
  featured: boolean;
  summary: string;
  managerName: string;
  mainImageUrl?: string;
  latitude?: number;
  longitude?: number;
  updatedAt: string;
  editLock?: DestinationEditLockDto;
}

interface DestinationInsightCard {
  label: string;
  value: string;
  pill: string;
  cardClass: 'kpi-dest-a' | 'kpi-dest-b' | 'kpi-dest-c';
  icon: string;
}

@Component({
  selector: 'app-destinations',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, PaginatorComponent],
  templateUrl: './destinations.component.html',
  styleUrls: [
    './destinations.component.css',
    '../shared/admin-page-title.css',
    '../shared/admin-page-stats-scroll.css'
  ]
})
export class DestinationsComponent implements OnInit, OnDestroy {

  private readonly destinationService = inject(DestinationService);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly localityService = inject(LocalityService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translationService = inject(TranslationService);

  private readonly objectsUrl = `${environment.apiUrl}/objects`;
  private readonly destroy$ = new Subject<void>();

  private allDestinations: AdminDestinationRow[] = [];

  isLoading = true;
  loadError = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter = 'all';
  regionFilter = 'all';
  sortBy: 'name' | 'region' | 'localityCount' | 'status' | 'updatedAt' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filterPanelOpen = true;

  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];

  selectedDestination: AdminDestinationRow | null = null;

  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;

  readonly sortByOptions = [
    { value: 'name', labelKey: 'adminDestinations.columns.destination' },
    { value: 'region', labelKey: 'adminDestinations.columns.region' },
    { value: 'localityCount', labelKey: 'adminDestinations.localities' },
    { value: 'status', labelKey: 'adminDestinations.columns.status' },
    { value: 'updatedAt', labelKey: 'adminDestinations.lastUpdated' }
  ];

  ngOnInit(): void {
    const presetRegion = this.route.snapshot.queryParamMap.get('region')?.trim();
    if (presetRegion) {
      this.regionFilter = presetRegion;
    }

    this.reloadFromApi();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get statusFilterOptions(): { value: string; label: string }[] {
    const options = [{ value: 'all', label: this.t('adminDestinations.filters.allStatuses') }];
    const hasPublished = this.allDestinations.some((d) => d.isPublished);
    const hasUnpublished = this.allDestinations.some((d) => !d.isPublished);

    if (hasPublished) {
      options.push({ value: 'published', label: this.t('adminDestinations.status.published') });
    }
    if (hasUnpublished) {
      options.push({ value: 'unpublished', label: this.t('adminDestinations.status.unpublished') });
    }

    return options;
  }

  get regionFilterOptions(): { value: string; label: string }[] {
    const names = new Set(
      this.allDestinations.map((d) => d.region).filter((r) => r && r.trim())
    );
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: this.t('adminDestinations.filters.allRegions') },
      ...sorted.map((r) => ({ value: r, label: r }))
    ];
  }

  get insightCards(): DestinationInsightCard[] {
    const filtered = this.applyFiltersToAll();
    const published = filtered.filter((d) => d.isPublished).length;
    const filteredCount = filtered.length;
    const pageShare =
      filteredCount > 0 ? Math.round((this.visibleDestinations.length / filteredCount) * 100) : 0;
    const publishedShare = filteredCount > 0 ? Math.round((published / filteredCount) * 100) : 0;

    return [
      {
        label: this.t('adminDestinations.insights.totalDestinations'),
        value: String(filteredCount),
        pill: String(this.allDestinations.length),
        cardClass: 'kpi-dest-a',
        icon: 'public'
      },
      {
        label: this.t('adminDestinations.insights.onThisPage'),
        value: String(this.visibleDestinations.length),
        pill: `${pageShare}%`,
        cardClass: 'kpi-dest-b',
        icon: 'view_list'
      },
      {
        label: this.t('adminDestinations.status.published'),
        value: String(published),
        pill: `${publishedShare}%`,
        cardClass: 'kpi-dest-c',
        icon: 'check_circle'
      }
    ];
  }

  get filteredSorted(): AdminDestinationRow[] {
    return this.applyFiltersToAll();
  }

  get totalCount(): number {
    return this.filteredSorted.length;
  }

  get totalPages(): number {
    if (!this.totalCount || this.pageSize < 1) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get visibleDestinations(): AdminDestinationRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSorted.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    if (!this.totalCount || !this.visibleDestinations.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.visibleDestinations.length - 1;
  }

  get hasSelectedCoordinates(): boolean {
    return (
      this.selectedDestination?.latitude != null && this.selectedDestination?.longitude != null
    );
  }

  get selectedLat(): number {
    return this.selectedDestination?.latitude ?? 42.424;
  }

  get selectedLng(): number {
    return this.selectedDestination?.longitude ?? 18.771;
  }

  get selectedMapLabel(): string {
    if (!this.selectedDestination) {
      return this.t('adminDestinations.destination');
    }
    return `${this.selectedDestination.name} · ${this.selectedDestination.region}`;
  }

  formatDateLabel(value?: string): string {
    if (!value) {
      return this.t('common.notAvailable');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.t('common.notAvailable');
    }

    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  objectCountLabel(count: number): string {
    return this.t('adminDestinations.objectCount', { count });
  }

  localitiesSummary(count: number): string {
    return this.t('adminDestinations.localityCount', { count });
  }

  detailMetaLabel(row: AdminDestinationRow): string {
    return this.t('adminDestinations.heroMeta', {
      region: row.region,
      localities: row.localityCount,
      objects: row.objectCount
    });
  }

  trackByDestinationId(_: number, row: AdminDestinationRow): number {
    return row.id;
  }

  selectDestination(row: AdminDestinationRow): void {
    this.setSelectedDestination(row);
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
  }

  private setSelectedDestination(row: AdminDestinationRow | null): void {
    const previousId = this.selectedDestination?.id ?? null;
    this.selectedDestination = row;

    if ((row?.id ?? null) !== previousId) {
      this.loadHeroImagesForSelectedDestination();
    }
  }

  private loadHeroImagesForSelectedDestination(): void {
    this.stopHeroImageRotation();
    this.heroImageUrls = [];
    this.currentHeroImageIndex = 0;

    if (!this.selectedDestination) {
      return;
    }

    const fallbackUrl =
      this.normalizeImageUrl(this.selectedDestination.mainImageUrl) ||
      this.normalizeImageUrl('/assets/pozadina.png');

    const requestedId = this.selectedDestination.id;
    this.destinationService.getImages(requestedId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (images: DestinationImageDto[]) => {
        if (this.selectedDestination?.id !== requestedId) {
          return;
        }
        const orderedUrls = (images ?? [])
          .slice()
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((image) => this.normalizeImageUrl(image.url))
          .filter((url): url is string => !!url);

        this.heroImageUrls =
          orderedUrls.length > 0 ? orderedUrls : fallbackUrl ? [fallbackUrl] : [];
        this.currentHeroImageIndex = 0;

        if (this.heroImageUrls.length > 1) {
          this.startHeroImageRotation();
        }

        this.cdr.detectChanges();
      },
      error: () => {
        if (this.selectedDestination?.id !== requestedId) {
          return;
        }
        this.heroImageUrls = fallbackUrl ? [fallbackUrl] : [];
        this.currentHeroImageIndex = 0;
        this.cdr.detectChanges();
      }
    });
  }

  private startHeroImageRotation(): void {
    this.stopHeroImageRotation();

    this.heroRotationTimerId = setInterval(() => {
      if (this.heroImageUrls.length <= 1) {
        return;
      }

      this.currentHeroImageIndex =
        (this.currentHeroImageIndex + 1) % this.heroImageUrls.length;
      this.cdr.detectChanges();
    }, HERO_IMAGE_ROTATION_INTERVAL_MS);
  }

  private stopHeroImageRotation(): void {
    if (this.heroRotationTimerId != null) {
      clearInterval(this.heroRotationTimerId);
      this.heroRotationTimerId = null;
    }
  }

  private normalizeImageUrl(value?: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return '';
    }

    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
      return trimmed;
    }

    try {
      return encodeURI(new URL(trimmed, document.baseURI).href);
    } catch {
      return encodeURI(trimmed);
    }
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
  }

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim().toLowerCase();
    this.currentPage = 1;
    this.syncSelectionAfterFilter();
  }

  onResetFilters(): void {
    this.draftSearchQuery = '';
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.regionFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.syncSelectionAfterFilter();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.syncSelectionAfterFilter();
  }

  onGoToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.syncSelectionToVisiblePage();
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.syncSelectionToVisiblePage();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.syncSelectionToVisiblePage();
    }
  }

  onAddDestination(): void {
    this.router.navigate(['/admin/destinations/create']);
  }

  onEditDestination(row: AdminDestinationRow): void {
    if (this.isEditLockedByAnother(row)) {
      return;
    }

    const pageOutlet = document.querySelector<HTMLElement>('.page-outlet');
    if (pageOutlet) {
      pageOutlet.scrollTop = 0;
    }

    this.router.navigate(['/admin/destinations/edit', row.id], {
      state: {
        linkedEntityCounts: {
          objects: row.objectCount ?? 0,
          localities: row.localityCount ?? 0
        }
      }
    });
  }

  isEditLockedByAnother(row: AdminDestinationRow | null | undefined): boolean {
    return Boolean(row?.editLock?.isLocked && !row.editLock.isOwnedByCurrentUser);
  }

  getEditDisabledTitle(row: AdminDestinationRow | null | undefined): string {
    if (!this.isEditLockedByAnother(row)) {
      return this.t('adminDestinations.editDestination');
    }

    const lockedBy = row?.editLock?.lockedByDisplayName?.trim() || this.t('adminDestinations.anotherAdmin');
    return this.t('adminDestinations.editLockedBy', { name: lockedBy });
  }

  getEditLockSummary(row: AdminDestinationRow | null | undefined): string {
    if (!this.isEditLockedByAnother(row)) {
      return '';
    }

    const lockedBy = row?.editLock?.lockedByDisplayName?.trim() || this.t('adminDestinations.anotherAdmin');
    return this.t('adminDestinations.editLockedBy', { name: lockedBy });
  }

  formatTableStatus(isPublished: boolean): string {
    return isPublished
      ? this.t('adminDestinations.status.published')
      : this.t('adminDestinations.status.unpublished');
  }

  getStatusClass(isPublished: boolean): string {
    return isPublished ? 'status-published' : 'status-draft';
  }

  getTableStatusClass(isPublished: boolean): string {
    return isPublished ? 'table-status-published' : 'table-status-draft';
  }

  getStatusBadgeClass(isPublished: boolean): string {
    return isPublished ? 'published' : 'draft';
  }

  destinationLocationText(row: AdminDestinationRow): string {
    const region = row.region?.trim();
    const country = row.country?.trim();
    if (region && country && region !== country) {
      return `${region} · ${country}`;
    }
    return region || country || this.t('common.notAvailable');
  }

  getDestinationMediaStyle(row: AdminDestinationRow): Record<string, string> {
    const image = row.mainImageUrl?.trim();
    if (!image) {
      return {};
    }
    return { 'background-image': `url("${image}")` };
  }

  onRowMoreActions(_row: AdminDestinationRow, event: Event): void {
    event.stopPropagation();
    // Wire to a context menu when flows are ready.
  }

  reloadFromApi(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      destinations: this.fetchAllPages((page) => this.loadDestinationsPage(page)),
      managers: this.fetchAllPages((page) => this.loadManagersPage(page)),
      localities: this.fetchAllPages((page) =>
        this.localityService.getAll(
          { page, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true }
        )
      ),
      objects: this.fetchAllPages((page) => this.loadObjectsPage(page))
    })
      .pipe(
        map(({ destinations, managers, localities, objects }) =>
          this.buildRowsFromApi(destinations, managers, localities, objects)
        ),
        catchError(() => {
          this.loadError = this.t('adminDestinations.loadError');
          return of([] as AdminDestinationRow[]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((rows) => {
        this.allDestinations = rows;
        this.syncStatusFilterWithData();
        if (!this.loadError) {
          this.syncSelectionAfterFilter();
        } else {
          this.setSelectedDestination(null);
        }
        this.cdr.detectChanges();
      });
  }

  private buildRowsFromApi(
    destinations: DestinationDto[],
    managers: AdminUserListItemDto[],
    localities: LocalityDto[],
    objects: ObjectDto[]
  ): AdminDestinationRow[] {
    const managersById = new Map<number, string>();
    for (const manager of managers) {
      const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim();
      managersById.set(manager.id, fullName || manager.email || this.t('common.notAvailable'));
    }

    const localityByDest = new Map<number, number>();
    for (const loc of localities) {
      const id = loc.destinationId;
      if (id == null) {
        continue;
      }
      localityByDest.set(id, (localityByDest.get(id) ?? 0) + 1);
    }

    const objectsByDest = new Map<number, number>();
    for (const obj of objects) {
      const id = obj.destinationId;
      if (id == null) {
        continue;
      }
      objectsByDest.set(id, (objectsByDest.get(id) ?? 0) + 1);
    }

    return destinations.map((d) =>
      this.mapDtoToRow(
        d,
        localityByDest.get(d.id) ?? 0,
        objectsByDest.get(d.id) ?? 0,
        managersById.get(d.managedByUserId ?? -1) ?? this.t('common.notAvailable')
      )
    );
  }

  private mapDtoToRow(
    dto: DestinationDto,
    localityCount: number,
    objectCount: number,
    managerName: string
  ): AdminDestinationRow {
    const ext = dto as DestinationDto & { updatedAt?: string | Date };
    let updatedAt = '';
    if (ext.updatedAt != null) {
      updatedAt =
        typeof ext.updatedAt === 'string'
          ? ext.updatedAt.slice(0, 10)
          : new Date(ext.updatedAt).toISOString().slice(0, 10);
    }
    if (!updatedAt) {
      updatedAt = new Date().toISOString().slice(0, 10);
    }

    return {
      id: dto.id,
      name: dto.name,
      publicId: `DEST-${String(dto.id).padStart(4, '0')}`,
      destinationType: dto.destinationTypeName?.trim() || this.t('common.notAvailable'),
      region: dto.regionName?.trim() ?? '',
      country: '',
      code: dto.regionCode?.trim() ?? '',
      isPublished: Boolean(dto.isActive),
      localityCount,
      objectCount,
      featured: false,
      summary: dto.description?.trim() || this.t('adminDestinations.noDescription'),
      managerName,
      mainImageUrl: dto.mainImageUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
      updatedAt,
      editLock: dto.editLock
    };
  }

  private syncStatusFilterWithData(): void {
    const validValues = new Set(this.statusFilterOptions.map((option) => option.value));
    if (!validValues.has(this.statusFilter)) {
      this.statusFilter = 'all';
    }
  }

  private loadDestinationsPage(
    page: number
  ): Observable<{ items?: DestinationDto[]; totalPages?: number }> {
    return this.destinationService
      .getAll({ page, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .pipe(
        map((res: unknown) => {
          if (Array.isArray(res)) {
            return { items: res, totalPages: 1 };
          }
          const p = res as { items?: DestinationDto[]; totalPages?: number };
          return {
            items: p?.items ?? [],
            totalPages: p?.totalPages ?? 0
          };
        })
      );
  }

  private loadObjectsPage(page: number): Observable<{ items?: ObjectDto[]; totalPages?: number }> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', '100')
      .set('sortBy', 'name')
      .set('sortOrder', 'asc');

    return this.http.get<unknown>(this.objectsUrl, { params }).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return { items: res as ObjectDto[], totalPages: 1 };
        }
        const p = res as { items?: ObjectDto[]; totalPages?: number };
        return {
          items: p?.items ?? [],
          totalPages: p?.totalPages ?? 0
        };
      })
    );
  }

  private loadManagersPage(page: number): Observable<{ items?: AdminUserListItemDto[]; totalPages?: number }> {
    return this.adminUsersService.searchManagers('', 100).pipe(
      map((res) => ({
        items: res.items ?? [],
        totalPages: res.totalPages ?? 0
      }))
    );
  }

  private fetchAllPages<T>(
    load: (page: number) => Observable<{ items?: T[]; totalPages?: number }>
  ): Observable<T[]> {
    return load(1).pipe(
      switchMap((first) => {
        const totalPages = first.totalPages ?? 0;
        if (totalPages <= 1) {
          return of(first.items ?? []);
        }
        const rest = Array.from({ length: totalPages - 1 }, (_, i) => load(i + 2));
        return forkJoin(rest).pipe(
          map((pages) => [...(first.items ?? []), ...pages.flatMap((p) => p.items ?? [])])
        );
      })
    );
  }

  private applyFiltersToAll(): AdminDestinationRow[] {
    let rows = [...this.allDestinations];

    if (this.searchQuery) {
      const q = this.searchQuery;
      rows = rows.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.region.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          d.publicId.toLowerCase().includes(q) ||
          d.managerName.toLowerCase().includes(q) ||
          d.destinationType.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter === 'published') {
      rows = rows.filter((d) => d.isPublished);
    } else if (this.statusFilter === 'unpublished') {
      rows = rows.filter((d) => !d.isPublished);
    }

    if (this.regionFilter !== 'all') {
      rows = rows.filter((d) => d.region === this.regionFilter);
    }

    const dir = this.sortOrder === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      switch (this.sortBy) {
        case 'region':
          cmp = a.region.localeCompare(b.region);
          break;
        case 'localityCount':
          cmp = a.localityCount - b.localityCount;
          break;
        case 'status':
          cmp = Number(a.isPublished) - Number(b.isPublished);
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      if (cmp !== 0) {
        return cmp * dir;
      }
      return a.id - b.id;
    });

    return rows;
  }

  private syncSelectionAfterFilter(): void {
    const visible = this.visibleDestinations;
    if (!this.selectedDestination || !visible.some((d) => d.id === this.selectedDestination?.id)) {
      this.setSelectedDestination(visible[0] ?? this.filteredSorted[0] ?? null);
    }
  }

  private syncSelectionToVisiblePage(): void {
    const visible = this.visibleDestinations;
    if (!visible.length) {
      this.setSelectedDestination(null);
      return;
    }
    if (!this.selectedDestination || !visible.some((d) => d.id === this.selectedDestination?.id)) {
      this.setSelectedDestination(visible[0]);
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }
}
