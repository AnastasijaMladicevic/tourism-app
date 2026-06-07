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
  ActivityDto,
  ActivityService,
} from '../../services/activity';
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

export interface ActivityView extends ActivityDto {
  isFavorite: boolean;
  favoriteId?: number;
}

@Component({
  selector: 'app-activities',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, TranslatePipe, LocationRequiredModalComponent],
  templateUrl: './activities.html',
  styleUrl: './activities.scss',
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  searchQuery = '';
  currentPage = 1;
  isLoading = true;
  errorMessage = '';
  activeFilters = new Set<string>();
  sortOption: 'az' | 'za' | 'distance' = 'az';
  totalCount = 0;
  hasNextPage = false;
  pageSize = 8;
  activities: ActivityView[] = [];
  visibleActivities: ActivityView[] = [];
  activityTypes: { id: number; name: string }[] = [];
  showSortMenu = false;
  showPageSizeMenu = false;
  showLocationModal = false;
  images: ImageDto[] = [];
  activity: ActivityDto | null = null;
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;

  private readonly nearbyRadiusMeters = 3_000_000;
  private readonly imageCache = new Map<number, ActivityDto['images']>();
  private readonly favoritePendingIds = new Set<number>();
  private favoritesLoaded = false;
  private loadToken = 0;
  private hasInitializedLanguageWatcher = false;
  private lastLanguage = 'sr';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly listStateKey = 'activities-list-state';
  private readonly returnFlagKey = 'activities-return-from-detail';
  private readonly pendingSortKey = 'activities-pending-sort';
  private readonly locationSubs = new Subscription();
  private readonly handleFavoriteObject = (event: Event & { detail?: ActivityView }) => {
    const obj = event.detail;
    if (obj) this.toggleFavorite(obj, new Event('click'));
  };

  constructor(
    private readonly router: Router,
    private readonly activityService: ActivityService,
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
          this.refreshVisibleActivities();
        }

        this.cdr.detectChanges();
      })
    );

    this.restoreSortOption();
    if (sessionStorage.getItem(this.returnFlagKey)) {
      sessionStorage.removeItem(this.returnFlagKey);
      this.restoreListState();
    }
    this.applyPendingSortIfReady();
    void this.loadData();

    window.addEventListener('favorite-object', this.handleFavoriteObject);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  private saveListState(): void {
    sessionStorage.setItem(this.listStateKey, JSON.stringify({
      searchQuery: this.searchQuery,
      activeFilters: [...this.activeFilters],
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
      this.activeFilters = new Set(Array.isArray(state.activeFilters) ? state.activeFilters : []);
      this.sortOption = state.sortOption ?? 'az';
      this.currentPage = state.currentPage ?? 1;
      this.pageSize = state.pageSize ?? 8;
    } catch {
      sessionStorage.removeItem(this.listStateKey);
    }
  }

  private applyPendingSortIfReady(): void {
    const pending = sessionStorage.getItem(this.pendingSortKey);
    if (!pending) return;
    sessionStorage.removeItem(this.pendingSortKey);
    if (pending === 'distance' && this.isTracking) {
      this.sortOption = 'distance';
      this.saveListState();
    }
  }

  private restoreSortOption(): void {
    const raw = sessionStorage.getItem(this.listStateKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as { sortOption?: string };
      const valid: Array<typeof this.sortOption> = ['az', 'za'];
      if (state.sortOption && valid.includes(state.sortOption as typeof this.sortOption)) {
        this.sortOption = state.sortOption as typeof this.sortOption;
      }
    } catch { /* ignore */ }
  }

  getDistance(activity: ActivityView): number | null {
    const location = this.locationTrackingService.getCurrentLocation();

    if (!this.locationTrackingService.isTrackingEnabled() || !location) {
      return null;
    }

    if (activity.latitude == null || activity.longitude == null) {
      return null;
    }

    const r = 6371;
    const dLat = this.toRad(activity.latitude - location.latitude);
    const dLng = this.toRad(activity.longitude - location.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(location.latitude)) *
      Math.cos(this.toRad(activity.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
  }

  private toRad(value?: number): number {
    return ((value ?? 0) * Math.PI) / 180;
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

  getDistanceText(item: ActivityView): string | null {
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
    this.refreshVisibleActivities();
    this.cdr.detectChanges();
  }

  togglePageSizeMenu(event: Event): void {
    event.stopPropagation();

    if (this.showSortMenu) {
      this.showSortMenu = false;
    }

    this.showPageSizeMenu = !this.showPageSizeMenu;
  }
  isFavoritePending(activityId: number): boolean {
    return this.favoritePendingIds.has(activityId);
  }

  private patchFavoriteState(activityId: number, isFavorite: boolean, favoriteId?: number): void {
    const applyPatch = (list: ActivityView[]) => {
      list.forEach((activity) => {
        if (activity.id === activityId) {
          activity.isFavorite = isFavorite;
          activity.favoriteId = favoriteId;
        }
      });
    };

    applyPatch(this.activities);
    applyPatch(this.visibleActivities);
  }

  toggleFavorite(activity: ActivityView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: activity,
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });

      return;
    }

    if (this.favoritePendingIds.has(activity.id)) {
      return;
    }

    this.favoritePendingIds.add(activity.id);

    this.favoriteStateService
      .toggle({ type: 'activity', entityId: activity.id }, activity.favoriteId)
      .subscribe({
        next: (state) => {
          this.patchFavoriteState(activity.id, state.isFavorite, state.favoriteId);
        },
        error: () => {
          this.favoritePendingIds.delete(activity.id);
          this.cdr.detectChanges();
        },
        complete: () => {
          this.favoritePendingIds.delete(activity.id);
          this.cdr.detectChanges();
        },
      });
  }

  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    this.saveListState();
    this.refreshVisibleActivities();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    this.saveListState();
    this.refreshVisibleActivities();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  viewDetails(activity: ActivityView): void {
    this.saveListState();
    sessionStorage.setItem(this.returnFlagKey, 'true');

    this.router.navigate(['/activity', activity.id], {
      queryParams: {
        returnUrl: this.router.url
      }
    });
  }

  getMainImage(activity: ActivityView): string {
    if (activity.images && activity.images.length > 0) {
      const mainImage = activity.images.find((image) => image.isMain);
      return mainImage?.url || activity.images[0].url;
    }

    return activity.mainImageUrl || '';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  async loadData(): Promise<void> {
    const currentToken = ++this.loadToken;
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const regionId = this.activeRegionService.getActiveRegionId() ?? 0;
    const lang = this.translationService.language();
    const cacheKey = `activities:r${regionId}:l${lang}`;

    try {
      const cached = this.dataCacheService.get<ActivityDto[]>(cacheKey);
      if (cached) {
        await this.ensureFavoritesLoaded();
        if (currentToken !== this.loadToken) return;
        this.applyActivitiesData(cached);
        return;
      }

      const pageSize = 100;
      const [firstPage] = await Promise.all([
        firstValueFrom(this.activityService.getPage({ page: 1, pageSize, sortBy: 'name', sortOrder: 'asc' })),
        this.ensureFavoritesLoaded(),
      ]);

      if (currentToken !== this.loadToken) return;

      const firstItems = firstPage.items ?? [];
      const totalPages = Math.max(1, firstPage.totalPages ?? 1);

      this.applyActivitiesData(firstItems);

      if (totalPages <= 1) {
        this.dataCacheService.set(cacheKey, firstItems);
        return;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          firstValueFrom(this.activityService.getPage({ page: i + 2, pageSize, sortBy: 'name', sortOrder: 'asc' }))
        )
      );

      if (currentToken !== this.loadToken) return;

      const all = [...firstItems, ...remainingPages.flatMap(p => p.items ?? [])];
      this.dataCacheService.set(cacheKey, all);
      this.applyActivitiesData(all);
    } catch (err) {
      if (currentToken !== this.loadToken) return;
      console.error(err);
      this.activities = [];
      this.visibleActivities = [];
      this.errorMessage = 'Failed to load activities.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private applyActivitiesData(allActivities: ActivityDto[]): void {
    this.activities = allActivities.map((activity) => ({
      ...this.normalizeActivity(activity),
      images: activity.images ?? this.imageCache.get(activity.id) ?? [],
      isFavorite: false,
      favoriteId: undefined,
    }));

    this.mergeActivityTypes(this.activities);
    this.favoriteStateService.applyToList(this.activities, (item) => ({
      type: 'activity',
      entityId: item.id,
    }));

    if (this.userLocation && this.sortOption !== 'distance') {
      this.updateDistances();
    } else if (!this.userLocation && this.sortOption !== 'distance') {
      this.clearDistances();
    }

    this.refreshVisibleActivities();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private refreshVisibleActivities(): void {
    let list = [...this.activities];

    // Pretraga
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(activity =>
        activity.name.toLowerCase().includes(q) ||
        (activity.description?.toLowerCase().includes(q) ?? false)
      );
    }

    // Filter po tipu
    if (this.activeFilters.size > 0) {
      list = list.filter(activity => this.activeFilters.has(activity.activityTypeName ?? ''));
    }

    // Sort
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
      this.visibleActivities = [];
      this.cdr.detectChanges();
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    this.currentPage = Math.min(this.currentPage, totalPages);
    this.hasNextPage = this.currentPage < totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageItems = list.slice(startIndex, startIndex + this.pageSize);

    this.visibleActivities = pageItems;
    this.favoriteStateService.applyToList(this.visibleActivities, (item) => ({
      type: 'activity',
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

  private async fetchActivitiesPage() {
    const query = {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.normalizeSearchQuery(),
      type: this.activeFilters.size === 1 ? [...this.activeFilters][0] : undefined,
    };

    if (this.sortOption === 'distance' && this.userLocation) {
      return firstValueFrom(
        this.activityService.getNearby({
          ...query,
          latitude: this.userLocation.lat,
          longitude: this.userLocation.lng,
          radiusMeters: this.nearbyRadiusMeters,
          sortOrder: 'asc',
        }),
      );
    }

    return firstValueFrom(
      this.activityService.getPage({
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

  private updateDistances(): void {
    if (!this.userLocation) return;

    this.activities = this.activities.map((item) => {
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

    const distancesById = new Map(this.activities.map((item) => [item.id, item.distanceMeters]));
    this.visibleActivities = this.visibleActivities.map((item) => ({
      ...item,
      distanceMeters: distancesById.get(item.id),
    }));
  }

  private clearDistances(): void {
    this.activities = this.activities.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));

    this.visibleActivities = this.visibleActivities.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));
  }

  private normalizeActivity(raw: ActivityDto): ActivityDto {
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
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      durationMinutes: this.readOptionalNumber(dto, ['durationMinutes', 'DurationMinutes']),
      activityTypeId: Number(dto['activityTypeId'] ?? dto['ActivityTypeId'] ?? 0),
      activityTypeName: String(dto['activityTypeName'] ?? dto['ActivityTypeName'] ?? ''),
      destinationName: String(dto['destinationName'] ?? dto['DestinationName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as ActivityDto['images']) || [],
      createdByUserId: Number(dto['createdByUserId'] ?? 0),
      createdAt: String(dto['createdAt'] ?? ''),
      destinationId: Number(dto['destinationId'] ?? 0),
      status: String(dto['status'] ?? ''),
      updatedAt: String(dto['updatedAt'] ?? ''),
      objectId: this.readOptionalNumber(dto, ['objectId', 'ObjectId']),
      objectName: (dto['objectName'] ?? dto['ObjectName'] ?? undefined) as string | undefined,
      regionId: this.readOptionalNumber(dto, ['regionId', 'RegionId']),
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? undefined) as string | undefined,
      regionCode: (dto['regionCode'] ?? dto['RegionCode'] ?? undefined) as string | undefined,
      localityId: this.readOptionalNumber(dto, ['localityId', 'LocalityId']),
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

  private mergeActivityTypes(items: ActivityView[]): void {
    const map = new Map(this.activityTypes.map((type) => [type.name, type]));

    items.forEach((item) => {
      if (item.activityTypeName) {
        map.set(item.activityTypeName, {
          id: item.activityTypeId,
          name: item.activityTypeName,
        });
      }
    });

    this.activityTypes = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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
      sessionStorage.setItem(this.pendingSortKey, 'distance');
      this.showLocationModal = true;
      return;
    }
    this.sortOption = option;
    this.showSortMenu = false;
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleActivities();
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
    if (filter === 'All') {
      this.activeFilters = new Set();
    } else if (this.activeFilters.has(filter)) {
      this.activeFilters.delete(filter);
      this.activeFilters = new Set(this.activeFilters);
    } else {
      this.activeFilters = new Set([...this.activeFilters, filter]);
    }
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleActivities();
  }

  private async getActivityImages(activity: ActivityView): Promise<ActivityDto['images']> {
    if (activity.images && activity.images.length > 0) {
      this.imageCache.set(activity.id, activity.images);
      return activity.images;
    }

    const cachedImages = this.imageCache.get(activity.id);
    if (cachedImages) {
      return cachedImages;
    }

    try {
      const images = (await firstValueFrom(this.imageService.getForActivity(activity.id))) ?? [];
      this.imageCache.set(activity.id, images);
      return images;
    } catch {
      this.imageCache.set(activity.id, []);
      return [];
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleActivities();
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
