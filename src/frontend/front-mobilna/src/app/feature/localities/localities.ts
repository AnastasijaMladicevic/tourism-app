import {
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of } from 'rxjs';
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

export interface LocalityView extends LocalityDto {
  isFavorite: boolean;
  favoriteId?: number;
}

@Component({
  selector: 'app-localities',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, TranslatePipe],
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
    this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
      this.isTracking = enabled;

      if (this.sortOption === 'distance') {
        void this.loadData();
        return;
      }

      if (!enabled) {
        this.clearDistances();
      } else {
        this.updateDistances();
      }

      this.cdr.detectChanges();
    });

    this.locationTrackingService.location$.subscribe((loc) => {
      this.userLocation = loc ? { lat: loc.latitude, lng: loc.longitude } : null;

      if (this.sortOption === 'distance') {
        void this.loadData();
        return;
      }

      if (this.userLocation) {
        this.updateDistances();
      } else {
        this.clearDistances();
      }

      this.cdr.detectChanges();
    });

    void this.loadData();

    window.addEventListener('favorite-object', (event: Event & { detail?: LocalityView }) => {
      const obj = event.detail;
      if (obj) {
        this.toggleFavorite(obj, new Event('click'));
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    void this.loadData();
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
    void this.loadData();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    void this.loadData();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  viewDetails(locality: LocalityView): void {
    this.router.navigate(['/locality', locality.id]);
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
      const response = await this.fetchLocalitiesPage();
      if (currentToken !== this.loadToken) {
        return;
      }

      this.totalCount = response.totalCount ?? 0;
      this.hasNextPage = (response.page ?? this.currentPage) < (response.totalPages ?? 0);

      const items = (response.items ?? []).map((locality) => ({
        ...this.normalizeLocality(locality),
        images: locality.images ?? this.imageCache.get(locality.id) ?? [],
        isFavorite: false,
        favoriteId: undefined,
      }));

      this.localities = items;
      this.mergeLocalityTypes(items);
      this.favoriteStateService.applyToList(this.localities, (item) => ({
        type: 'locality',
        entityId: item.id,
      }));

      if (this.userLocation && this.sortOption !== 'distance') {
        this.updateDistances();
      } else if (!this.userLocation && this.sortOption !== 'distance') {
        this.clearDistances();
      }

      this.visibleLocalities = await Promise.all(
        this.localities.map(async (item) => ({
          ...item,
          images: await this.getLocalityImages(item),
        })),
      );
      this.favoriteStateService.applyToList(this.visibleLocalities, (item) => ({
        type: 'locality',
        entityId: item.id,
      }));

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
      if (currentToken !== this.loadToken) {
        return;
      }

      console.error(err);
      this.localities = [];
      this.visibleLocalities = [];
      this.totalCount = 0;
      this.hasNextPage = false;
      this.errorMessage = 'Failed to load localities.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
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
    this.sortOption = option;
    this.showSortMenu = false;
    this.currentPage = 1;
    void this.loadData();
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    void this.loadData();
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
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      void this.loadData();
    }, 400);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}
