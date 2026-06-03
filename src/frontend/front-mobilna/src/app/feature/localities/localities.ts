import {
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of, Subscription } from 'rxjs';
import {
  LocalityDto,
  LocalityService,
} from '../../services/locality';
import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { LocationTrackingService } from '../../services/location-tracking';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ActiveRegionService } from '../../services/active-region';
import { DataCacheService } from '../../services/data-cache';
import { LocationRequiredModalComponent } from '../../shared/components/location-required-modal/location-required-modal.component';

export interface LocalityView extends LocalityDto {
  isFavorite: boolean;
  favoriteId?: number;
}

@Component({
  selector: 'app-localities',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, TranslatePipe, LocationRequiredModalComponent],
  templateUrl: './localities.html',
  styleUrl: './localities.scss',
})
export class LocalitiesComponent implements OnInit, OnDestroy {
  searchQuery = '';
  currentPage = 1;
  isLoading = true;
  errorMessage = '';
  activeFilter = 'All';
  sortOption: 'az' | 'za' | 'distance' = 'az';
  totalCount = 0;
  hasNextPage = false;
  pageSize = 8;
  localities: LocalityView[] = [];
  visibleLocalities: LocalityView[] = [];
  localityTypes: { id: number; name: string }[] = [];
  showSortMenu = false;
  showPageSizeMenu = false;
  showLocationModal = false;
  images: ImageDto[] = [];
  locality: LocalityDto | null = null;
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;

  private readonly nearbyRadiusMeters = 3_000_000;
  private readonly imageCache = new Map<number, LocalityDto['images']>();
  private readonly favoritePendingIds = new Set<number>();
  private favoritesLoaded = false;
  private loadToken = 0;
  private hasInitializedLanguageWatcher = false;
  private lastLanguage = 'sr';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly listStateKey = 'localities-list-state';
  private readonly returnFlagKey = 'localities-return-from-detail';
  private readonly locationSubs = new Subscription();
  private readonly handleFavoriteObject = (event: Event & { detail?: LocalityView }) => {
    const obj = event.detail;
    if (obj) this.toggleFavorite(obj, new Event('click'));
  };

  constructor(
    private readonly router: Router,
    private readonly localityService: LocalityService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly imageService: ImageService,
    private readonly favoriteStateService: FavoriteStateService,
    private readonly locationTrackingService: LocationTrackingService,
    private readonly pendingActionService: PendingActionService,
    private readonly translationService: TranslationService,
    private readonly activeRegionService: ActiveRegionService,
    private readonly dataCacheService: DataCacheService,
  ) {
    effect(() => {
      const language = this.translationService.language();

      if (!this.hasInitializedLanguageWatcher) {
        this.lastLanguage = language;
        this.hasInitializedLanguageWatcher = true;
        return;
      }

      if (language === this.lastLanguage) {
        return;
      }

      this.lastLanguage = language;
      this.currentPage = 1;
      void this.loadData();
    });
  }
  @ViewChild('top') top!: ElementRef;
  ngOnInit(): void {
    this.locationSubs.add(
      this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
        this.isTracking = enabled;

        if (!enabled) {
          this.clearDistances();
        } else {
          this.updateDistances();
        }

        this.cdr.detectChanges();
      })
    );

    this.locationSubs.add(
      this.locationTrackingService.location$.subscribe((loc) => {
        this.userLocation = loc ? { lat: loc.latitude, lng: loc.longitude } : null;

        if (this.userLocation) {
          this.updateDistances();
        } else {
          this.clearDistances();
        }

        if (this.sortOption === 'distance') {
          void this.refreshVisibleLocalities();
        }

        this.cdr.detectChanges();
      })
    );

    if (sessionStorage.getItem(this.returnFlagKey)) {
      sessionStorage.removeItem(this.returnFlagKey);
      this.restoreListState();
    }
    void this.loadData();

    window.addEventListener('favorite-object', this.handleFavoriteObject);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.sort-anchor')) {
      this.showSortMenu = false;
      this.showPageSizeMenu = false;
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.saveListState();
    void this.refreshVisibleLocalities();
    this.cdr.detectChanges();
  }

  togglePageSizeMenu(event: Event): void {
    event.stopPropagation();

    if (this.showSortMenu) {
      this.showSortMenu = false;
    }

    this.showPageSizeMenu = !this.showPageSizeMenu;
  }

  private saveListState(): void {
    sessionStorage.setItem(this.listStateKey, JSON.stringify({
      searchQuery: this.searchQuery,
      activeFilter: this.activeFilter,
      sortOption: this.sortOption,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
    }));
  }
  
  private restoreListState(): void {
    const raw = sessionStorage.getItem(this.listStateKey);
    if (!raw) return;
  
    try {
      const state = JSON.parse(raw);
  
      this.searchQuery = state.searchQuery ?? '';
      this.activeFilter = state.activeFilter ?? 'All';
      this.sortOption = state.sortOption ?? 'az';
      this.currentPage = state.currentPage ?? 1;
      this.pageSize = state.pageSize ?? 8;
    } catch {
      sessionStorage.removeItem(this.listStateKey);
    }
  }

  isFavoritePending(localityId: number): boolean {
    return this.favoritePendingIds.has(localityId);
  }

  private patchFavoriteState(localityId: number, isFavorite: boolean, favoriteId?: number): void {
    const applyPatch = (list: LocalityView[]) => {
      list.forEach((locality) => {
        if (locality.id === localityId) {
          locality.isFavorite = isFavorite;
          locality.favoriteId = favoriteId;
        }
      });
    };

    applyPatch(this.localities);
    applyPatch(this.visibleLocalities);
  }

  toggleFavorite(locality: LocalityView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: locality,
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });

      return;
    }

    if (this.favoritePendingIds.has(locality.id)) {
      return;
    }

    this.favoritePendingIds.add(locality.id);

    this.favoriteStateService
      .toggle({ type: 'locality', entityId: locality.id }, locality.favoriteId)
      .subscribe({
        next: (state) => {
          this.patchFavoriteState(locality.id, state.isFavorite, state.favoriteId);
        },
        error: () => {
          this.favoritePendingIds.delete(locality.id);
          this.cdr.detectChanges();
        },
        complete: () => {
          this.favoritePendingIds.delete(locality.id);
          this.cdr.detectChanges();
        },
      });
  }

  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    this.saveListState();
    void this.refreshVisibleLocalities();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    this.saveListState();
    void this.refreshVisibleLocalities();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  viewDetails(locality: LocalityView): void {
    this.saveListState();
    sessionStorage.setItem(this.returnFlagKey, 'true');

    this.router.navigate(['/locality', locality.id], {
      queryParams: {
        returnUrl: this.router.url
      }
    });
  }

  getLocalityLocation(locality: LocalityView): string {
    return [locality.destinationName, locality.regionName]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(', ');
  }

  getMainImage(locality: LocalityView): string {
    if (locality.images && locality.images.length > 0) {
      const mainImage = locality.images.find((image) => image.isMain);
      return mainImage?.url || locality.images[0].url;
    }

    return this.locality?.mainImageUrl || '';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  async loadData(): Promise<void> {
    const currentToken = ++this.loadToken;
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      await this.ensureFavoritesLoaded();

      const allLocalities = await this.fetchAllLocalities();

      if (currentToken !== this.loadToken) return;

      this.localities = allLocalities.map((locality: LocalityDto) => ({
        ...this.normalizeLocality(locality),
        images: locality.images ?? this.imageCache.get(locality.id) ?? [],
        isFavorite: false,
        favoriteId: undefined,
      }));

      this.mergeLocalityTypes(this.localities);
      this.favoriteStateService.applyToList(this.localities, (item) => ({
        type: 'locality',
        entityId: item.id,
      }));

      if (this.userLocation && this.sortOption !== 'distance') {
        this.updateDistances();
      } else if (!this.userLocation && this.sortOption !== 'distance') {
        this.clearDistances();
      }

      this.refreshVisibleLocalities();

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
      if (currentToken !== this.loadToken) return;
      console.error(err);
      this.localities = [];
      this.visibleLocalities = [];
      this.errorMessage = 'Failed to load localities.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  private async fetchAllLocalities(): Promise<LocalityDto[]> {
    const regionId = this.activeRegionService.getActiveRegionId() ?? 0;
    const lang = this.translationService.language();
    const cacheKey = `localities:r${regionId}:l${lang}`;
    const cached = this.dataCacheService.get<LocalityDto[]>(cacheKey);
    if (cached) return cached;

    const all: LocalityDto[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const response = await firstValueFrom(
        this.localityService.getPage({
          page,
          pageSize,
          search: undefined,
          type: undefined,
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );

      const items = response.items ?? [];
      all.push(...items);

      if (items.length < pageSize) break;
      page++;
    }

    this.dataCacheService.set(cacheKey, all);
    return all;
  }
  private async refreshVisibleLocalities(): Promise<void> {
    let list = [...this.localities];

    // Pretraga
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(loc =>
        loc.name.toLowerCase().includes(q) ||
        (loc.description?.toLowerCase().includes(q) ?? false)
      );
    }

    // Filter po tipu
    if (this.activeFilter !== 'All') {
      list = list.filter(loc => loc.localityTypeName === this.activeFilter);
    }

    // Sortiranje
    switch (this.sortOption) {
      case 'az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'za':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'distance':
        list.sort((a, b) => (a.distanceMeters ?? 999999999) - (b.distanceMeters ?? 999999999));
        break;
    }

    this.totalCount = list.length;

    if (this.totalCount === 0) {
      this.currentPage = 1;
      this.hasNextPage = false;
      this.visibleLocalities = [];
      this.cdr.detectChanges();
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    this.currentPage = Math.min(this.currentPage, totalPages);
    this.hasNextPage = this.currentPage < totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageItems = list.slice(startIndex, startIndex + this.pageSize);

    this.visibleLocalities = await Promise.all(
      pageItems.map(async (item) => ({
        ...item,
        images: await this.getLocalityImages(item),
      }))
    );

    this.favoriteStateService.applyToList(this.visibleLocalities, (item) => ({
      type: 'locality',
      entityId: item.id,
    }));

    this.cdr.detectChanges();
  }

  private async ensureFavoritesLoaded(): Promise<void> {
    if (this.favoritesLoaded || !this.authService.isLoggedIn()) {
      return;
    }

    await firstValueFrom(
      this.favoriteStateService
        .loadFavorites(true)
        .pipe(catchError(() => of(new Map<string, number>()))),
    );

    this.favoritesLoaded = true;
  }

  private async fetchLocalitiesPage() {
    const query = {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.normalizeSearchQuery(),
      type: this.activeFilter !== 'All' ? this.activeFilter : undefined,
    };

    if (this.sortOption === 'distance' && this.userLocation) {
      return firstValueFrom(
        this.localityService.getNearby({
          ...query,
          latitude: this.userLocation.lat,
          longitude: this.userLocation.lng,
          radiusMeters: this.nearbyRadiusMeters,
          sortOrder: 'asc',
        }),
      );
    }

    return firstValueFrom(
      this.localityService.getPage({
        ...query,
        sortBy: 'name',
        sortOrder: this.sortOption === 'za' ? 'desc' : 'asc',
      }),
    );
  }

  private normalizeSearchQuery(): string | undefined {
    const query = this.searchQuery.trim();
    return query.length > 0 ? query : undefined;
  }

  private normalizeLocality(raw: LocalityDto): LocalityDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      mainImageUrl: (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      distanceMeters: this.readOptionalNumber(dto, ['distanceMeters', 'DistanceMeters']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      regionId: this.readOptionalNumber(dto, ['regionId', 'RegionId']),
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? undefined) as string | undefined,
      regionCode: (dto['regionCode'] ?? dto['RegionCode'] ?? undefined) as string | undefined,
      localityTypeId: Number(dto['localityTypeId'] ?? dto['LocalityTypeId'] ?? 0),
      localityTypeName: String(dto['localityTypeName'] ?? dto['LocalityTypeName'] ?? ''),
      destinationName: String(dto['destinationName'] ?? dto['DestinationName'] ?? ''),
      images: ((dto['images'] ?? dto['Images'] ?? []) as LocalityDto['images']) || [],
      createdByUserId: Number(dto['createdByUserId'] ?? 0),
      createdAt: String(dto['createdAt'] ?? ''),
      destinationId: Number(dto['destinationId'] ?? 0),
    };
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) {
        continue;
      }

      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private updateDistances(): void {
    if (!this.userLocation) return;

    this.localities = this.localities.map((item) => {
      if (item.latitude == null || item.longitude == null) {
        return { ...item, distanceMeters: undefined };
      }

      return {
        ...item,
        distanceMeters: this.getDistanceKm(
          this.userLocation!.lat,
          this.userLocation!.lng,
          item.latitude,
          item.longitude,
        ),
      };
    });

    const distancesById = new Map(this.localities.map((item) => [item.id, item.distanceMeters]));
    this.visibleLocalities = this.visibleLocalities.map((item) => ({
      ...item,
      distanceMeters: distancesById.get(item.id),
    }));
  }

  private clearDistances(): void {
    this.localities = this.localities.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));

    this.visibleLocalities = this.visibleLocalities.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));
  }

  getDistanceText(item: LocalityView): string | null {
    if (!this.isTracking || !this.userLocation) return null;
    if (!item.latitude || !item.longitude) return null;

    const km = this.getDistanceKm(
      this.userLocation.lat,
      this.userLocation.lng,
      item.latitude,
      item.longitude,
    );

    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const r = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private mergeLocalityTypes(items: LocalityView[]): void {
    const map = new Map(this.localityTypes.map((type) => [type.name, type]));

    items.forEach((item) => {
      if (item.localityTypeName) {
        map.set(item.localityTypeName, {
          id: item.localityTypeId,
          name: item.localityTypeName,
        });
      }
    });

    this.localityTypes = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  sortLabel(): string {
    const map = {
      az: 'A -> Z',
      za: 'Z -> A',
      distance: this.translationService.translate('common.nearest'),
    };
    return map[this.sortOption];
  }

  setSort(option: 'az' | 'za' | 'distance'): void {
    if (option === 'distance' && !this.isTracking) {
      this.showSortMenu = false;
      this.showLocationModal = true;
      return;
    }
    this.sortOption = option;
    this.showSortMenu = false;
    this.currentPage = 1;
    this.saveListState();
    void this.refreshVisibleLocalities();
  }

  openLocationSettings(): void {
    this.showLocationModal = false;
    void this.router.navigate(['/location-settings'], {
      queryParams: { locationConsent: '1', returnUrl: this.router.url }
    });
  }

  dismissLocationModal(): void {
    this.showLocationModal = false;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    this.saveListState();
    void this.refreshVisibleLocalities();
  }

  private async getLocalityImages(locality: LocalityView): Promise<LocalityDto['images']> {
    if (locality.images && locality.images.length > 0) {
      this.imageCache.set(locality.id, locality.images);
      return locality.images;
    }

    const cachedImages = this.imageCache.get(locality.id);
    if (cachedImages) {
      return cachedImages;
    }

    try {
      const images = (await firstValueFrom(this.imageService.getForLocality(locality.id))) ?? [];
      this.imageCache.set(locality.id, images);
      return images;
    } catch {
      this.imageCache.set(locality.id, []);
      return [];
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.saveListState();
    void this.refreshVisibleLocalities();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.locationSubs.unsubscribe();
    window.removeEventListener('favorite-object', this.handleFavoriteObject);
  }
}
