import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
import { FilterOption, LocalityDto, LocalityImageDto, LocalityService } from '../../../services/locality.service';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { DestinationService } from '../../../services/destination.service';
import { AuthService } from '../../../services/auth.service';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';

@Component({
  selector: 'app-manager-localities',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, PaginatorComponent],
  templateUrl: './localities.component.html',
  styleUrls: [
    './localities.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-cc-page-parity.css',
    '../shared/manager-list-detail-layout.css',
    '../shared/manager-page-stats-scroll.css',
    '../shared/manager-stat-cards.css',
    '../shared/manager-hero-slides.css'
  ]
})
export class ManagerLocalitiesComponent implements OnInit, OnDestroy {
  private readonly localityService = inject(LocalityService);
  private readonly destinationService = inject(DestinationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  localities: LocalityDto[] = [];
  selectedLocality: LocalityDto | null = null;

  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;

  isLoading = true;
  errorMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter = 'all';
  destinationFilter = 'all';
  typeFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filterPanelOpen = true;

  destinationOptions: FilterOption[] = [];
  typeOptions: FilterOption[] = [];
  statusOptions: FilterOption[] = [];

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];
  private managedDestinationIds = new Set<number>();
  private readonly creatorNameById = new Map<number, string>();

  ngOnInit(): void {
    this.loadManagedDestinationScope();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
  }

  get totalLocalitiesOnPage(): number {
    return this.localities.length;
  }

  get localitiesCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    const count = this.totalCount;
    return `${count} localit${count === 1 ? 'y' : 'ies'}`;
  }

  get pageStart(): number {
    if (!this.totalCount || !this.localities.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.localities.length - 1;
  }

  get activePercent(): string {
    if (!this.localities.length) {
      return '0%';
    }
    const active = this.localities.filter((item) => item.isActive).length;
    return `${Math.round((active / this.localities.length) * 100)}%`;
  }

  get selectedCoordinates(): string {
    if (this.selectedLocality?.latitude == null || this.selectedLocality?.longitude == null) {
      return 'N/A';
    }
    return `${this.selectedLocality.latitude.toFixed(4)}, ${this.selectedLocality.longitude.toFixed(4)}`;
  }

  get hasSelectedLocalityCoordinates(): boolean {
    return this.selectedLocality?.latitude != null && this.selectedLocality?.longitude != null;
  }

  get selectedLocalityLat(): number {
    return this.selectedLocality?.latitude ?? 42.424;
  }

  get selectedLocalityLng(): number {
    return this.selectedLocality?.longitude ?? 18.771;
  }

  get selectedLocalityLocationLabel(): string {
    if (!this.selectedLocality) {
      return 'Selected locality';
    }

    return `${this.selectedLocality.name} · ${this.selectedLocality.destinationName || this.selectedLocality.regionName}`;
  }

  loadLocalities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.localityService
      .getAll({
        page: 1,
        pageSize: 500,
        search: this.searchQuery || undefined,
        destination: this.destinationFilter !== 'all' ? this.destinationFilter : undefined,
        type: this.typeFilter !== 'all' ? this.typeFilter : undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder
      }, { bypassRegion: true })
      .subscribe({
        next: (response) => {
          const scopedItems = this.applyManagerScopeFilters(response?.items ?? []);
          const filteredItems = this.statusFilter === 'all'
            ? scopedItems
            : scopedItems.filter((item) => this.getStatusLabel(item).toLowerCase() === this.statusFilter.toLowerCase());

          this.totalCount = filteredItems.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
          }

          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.localities = filteredItems.slice(start, end);
          this.loadCreatorNamesForRows(this.localities);

          if (!this.selectedLocality || !this.localities.some((item) => item.id === this.selectedLocality?.id)) {
            this.setSelectedLocality(this.localities[0] ?? null);
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load localities';
          this.localities = [];
          this.setSelectedLocality(null);
          this.totalCount = 0;
          this.totalPages = 1;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadManagedDestinationScope(): void {
    this.destinationService
      .getAll({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .subscribe({
        next: (response: unknown) => {
          const list = Array.isArray(response) ? response : (response as { items?: unknown[] })?.items ?? [];
          const destinations = list as Array<{ id?: number }>;

          this.managedDestinationIds = new Set(
            destinations
              .map((d) => d.id)
              .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
          );

          this.loadFilterOptions();
          this.loadLocalities();
        },
        error: () => {
          this.managedDestinationIds.clear();
          this.loadFilterOptions();
          this.loadLocalities();
        }
      });
  }

  loadFilterOptions(): void {
    this.localityService.getAll({
      page: 1,
      pageSize: 500,
      sortBy: 'name',
      sortOrder: 'asc'
    }, { bypassRegion: true }).subscribe({
      next: (response) => {
        const scopedItems = this.applyManagerScopeFilters(response?.items ?? []);
        const destinationOptions = this.toUniqueOptions(scopedItems.map((item) => item.destinationName));
        const typeOptions = this.toUniqueOptions(scopedItems.map((item) => item.localityTypeName));
        const statusOptions = this.toUniqueOptions(
          scopedItems.map((item) => (item.isActive ? 'Published' : 'Archived'))
        );

        this.destinationOptions = destinationOptions;
        this.typeOptions = typeOptions;
        this.statusOptions = statusOptions;

        if (this.destinationFilter !== 'all' && !destinationOptions.some((o) => o.value === this.destinationFilter)) {
          this.destinationFilter = 'all';
        }

        if (this.typeFilter !== 'all' && !typeOptions.some((o) => o.value === this.typeFilter)) {
          this.typeFilter = 'all';
        }

        if (this.statusFilter !== 'all' && !statusOptions.some((o) => o.value === this.statusFilter)) {
          this.statusFilter = 'all';
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.destinationOptions = [];
        this.typeOptions = [];
        this.statusOptions = [];
      }
    });
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onCreateLocation(): void {
    this.router.navigate(['/manager/localities/create']);
  }

  onEditLocation(locality: LocalityDto): void {
    this.router.navigate(['/manager/localities/edit', locality.id]);
  }

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadLocalities();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.destinationFilter = 'all';
    this.typeFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.loadLocalities();
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
  }

  onPreviousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }
    this.currentPage--;
    this.loadLocalities();
  }

  onGoToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLocalities();
    }
  }

  onNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }
    this.currentPage++;
    this.loadLocalities();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadLocalities();
  }

  selectLocality(locality: LocalityDto): void {
    this.setSelectedLocality(locality);
  }

  private setSelectedLocality(locality: LocalityDto | null): void {
    const previousId = this.selectedLocality?.id ?? null;
    this.selectedLocality = locality;

    if ((locality?.id ?? null) !== previousId) {
      this.loadHeroImagesForSelectedLocality();
    }
  }

  private loadHeroImagesForSelectedLocality(): void {
    this.stopHeroImageRotation();
    this.heroImageUrls = [];
    this.currentHeroImageIndex = 0;

    if (!this.selectedLocality) {
      return;
    }

    const fallbackUrl = this.normalizeImageUrl(this.selectedLocality.mainImageUrl);

    this.localityService.getImages(this.selectedLocality.id).subscribe({
      next: (images: LocalityImageDto[]) => {
        const orderedUrls = (images ?? [])
          .slice()
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((image) => this.normalizeImageUrl(image.url))
          .filter((url): url is string => !!url);

        this.heroImageUrls = orderedUrls.length > 0
          ? orderedUrls
          : (fallbackUrl ? [fallbackUrl] : []);
        this.currentHeroImageIndex = 0;

        if (this.heroImageUrls.length > 1) {
          this.startHeroImageRotation();
        }

        this.cdr.detectChanges();
      },
      error: () => {
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

  trackByLocalityId(_: number, locality: LocalityDto): number {
    return locality.id;
  }

  getStatusLabel(locality: LocalityDto): string {
    return locality.isActive ? 'Published' : 'Archived';
  }

  getStatusClass(locality: LocalityDto): string {
    return locality.isActive ? 'published' : 'draft';
  }

  getCreatedByLabel(locality: LocalityDto): string {
    if (locality.createdByUserId == null) {
      return 'N/A';
    }

    const displayName = this.creatorNameById.get(locality.createdByUserId);
    return displayName || `User #${locality.createdByUserId}`;
  }

  getCoordinatesLabel(locality: LocalityDto): string {
    if (locality.latitude == null || locality.longitude == null) {
      return 'N/A';
    }
    return `${locality.latitude.toFixed(4)}, ${locality.longitude.toFixed(4)}`;
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
  }

  getMediaStyle(locality: LocalityDto): Record<string, string> {
    const image = this.normalizeImageUrl(locality.mainImageUrl);
    if (!image) {
      return {};
    }
    return { 'background-image': `url("${image}")` };
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

  private applyManagerScopeFilters(items: LocalityDto[]): LocalityDto[] {
    if (!this.managedDestinationIds.size) {
      return [];
    }

    return items.filter((item) => this.managedDestinationIds.has(item.destinationId));
  }

  private toUniqueOptions(values: Array<string | undefined>): FilterOption[] {
    const unique = values
      .map((value) => value?.trim())
      .filter((value): value is string => !!value)
      .filter((value, index, all) => all.findIndex((x) => x.toLowerCase() === value.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b));

    return unique.map((value) => ({
      value,
      label: value
    }));
  }

  private loadCreatorNamesForRows(rows: LocalityDto[]): void {
    const creatorIds = [
      ...new Set(
        rows
          .map((row) => row.createdByUserId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
      )
    ];

    for (const userId of creatorIds) {
      if (this.creatorNameById.has(userId)) {
        continue;
      }

      this.authService.getById(userId).subscribe({
        next: (user) => {
          const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
          this.creatorNameById.set(userId, fullName || `User #${userId}`);
          this.cdr.detectChanges();
        },
        error: () => {
          this.creatorNameById.set(userId, `User #${userId}`);
        }
      });
    }
  }
}
