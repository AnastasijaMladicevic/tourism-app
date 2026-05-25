import {
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of } from 'rxjs';

import {
  NearbyObjectQueryParams,
  ObjectDto,
  ObjectService,
  ObjectView,
  PagedResultDto,
} from '../../services/object';
import { AuthService } from '../../services/auth';
import { LocationTrackingService } from '../../services/location-tracking';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-objects',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './objects.html',
  styleUrls: ['./objects.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObjectsComponent implements OnInit, OnDestroy {
  searchQuery = '';
  activeFilter = 'All';
  minRatingFilter = 0;
  sortOption: 'rating' | 'az' | 'za' | 'distance' = 'rating';
  showSortMenu = false;
  showPageSizeMenu = false;
  isLoading = true;
  errorMessage = '';
  pageTitle = '';
  hideTypeFilters = false;
  currentPage = 1;
  pageSize = 8;
  hasNextPage = false;
  totalCount = 0;
  pageSizeOptions = [8, 12, 16, 24, 32];
  objectTypes = [
    { id: 1, name: 'Hrana i pice' },
    { id: 2, name: 'Pumpe' },
    { id: 3, name: 'Smestaj' },
    { id: 4, name: 'Soping' },
    { id: 5, name: 'Bolnice' },
  ];
  objects: ObjectView[] = [];
  visibleObjects: ObjectView[] = [];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  private readonly favoritePendingIds = new Set<number>();
  private readonly nearbyRadiusMeters = 3_000_000;
  private favoritesLoaded = false;
  private loadToken = 0;
  private hasInitializedLanguageWatcher = false;
  private lastLanguage = 'sr';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly objectService: ObjectService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly locationTrackingService: LocationTrackingService,
    private readonly favoriteStateService: FavoriteStateService,
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

    this.route.data.subscribe((routeData) => {
      const type = routeData['type'] as string | null;
      this.pageTitle = this.translationService.translate('object.listTitle');

      this.hideTypeFilters = Boolean(type);
      this.activeFilter = type ?? 'All';
      this.currentPage = 1;

      void this.loadData();
    });

    window.addEventListener('favorite-object', (event: Event & { detail?: ObjectView }) => {
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
    this.cdr.detectChanges();
  }
  togglePageSizeMenu(event: Event): void {
    event.stopPropagation();

    if (this.showSortMenu) {
      this.showSortMenu = false;
    }

    this.showPageSizeMenu = !this.showPageSizeMenu;
  }
  async loadData(): Promise<void> {
    const currentToken = ++this.loadToken;
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      await this.ensureFavoritesLoaded();

      const response = await this.fetchObjectsPage();
      if (currentToken !== this.loadToken) {
        return;
      }

      this.totalCount = response.totalCount ?? 0;
      this.hasNextPage = (response.page ?? this.currentPage) < (response.totalPages ?? 0);

      this.objects = (response.items ?? []).map((obj) => {
        const raw = obj as unknown as Record<string, unknown>;

        return {
          ...obj,
          latitude: this.readOptionalNumber(raw, ['latitude', 'Latitude']),
          longitude: this.readOptionalNumber(raw, ['longitude', 'Longitude']),
          distanceMeters: this.readOptionalNumber(raw, ['distanceMeters', 'DistanceMeters']),
          averageRating: this.readOptionalNumber(raw, ['averageRating', 'AverageRating']),
          reviewCount: this.readOptionalNumber(raw, ['reviewCount', 'ReviewCount']),
          isFavorite: false,
          favoriteId: undefined,
        };
      });

      if (this.userLocation && this.sortOption !== 'distance') {
        this.updateDistances();
      } else if (!this.userLocation && this.sortOption !== 'distance') {
        this.clearDistances();
      }

      this.visibleObjects = [...this.objects];
      this.favoriteStateService.applyToList(this.objects, (object) => ({
        type: 'object',
        entityId: object.id,
      }));
      this.favoriteStateService.applyToList(this.visibleObjects, (object) => ({
        type: 'object',
        entityId: object.id,
      }));

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
      if (currentToken !== this.loadToken) {
        return;
      }

      console.error(err);
      this.objects = [];
      this.visibleObjects = [];
      this.totalCount = 0;
      this.hasNextPage = false;
      this.isLoading = false;
      this.errorMessage = this.translationService.translate('object.loadError');
      this.cdr.detectChanges();
    }
  }

  private async ensureFavoritesLoaded(): Promise<void> {
    if (this.favoritesLoaded || !this.authService.isLoggedIn()) {
      return;
    }

    await firstValueFrom(
      this.favoriteStateService.loadFavorites(true).pipe(
        catchError(() => of(new Map<string, number>())),
      ),
    );
    this.favoritesLoaded = true;
  }

  private async fetchObjectsPage(): Promise<PagedResultDto<ObjectDto>> {
    const query = {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.normalizeSearchQuery(),
      type: this.resolveTypeFilter(),
      minRating: this.minRatingFilter > 0 ? this.minRatingFilter : undefined,
    };

    if (this.sortOption === 'distance' && this.userLocation) {
      const nearbyQuery: NearbyObjectQueryParams = {
        ...query,
        latitude: this.userLocation.lat,
        longitude: this.userLocation.lng,
        radiusMeters: this.nearbyRadiusMeters,
        sortOrder: 'asc',
      };

      return firstValueFrom(this.objectService.getNearby(nearbyQuery));
    }

    const sort = this.resolveSortQuery();
    return firstValueFrom(
      this.objectService.getPage({
        ...query,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      }),
    );
  }

  private resolveSortQuery(): { sortBy: string; sortOrder: string } {
    switch (this.sortOption) {
      case 'rating':
        return { sortBy: 'rating', sortOrder: 'desc' };
      case 'za':
        return { sortBy: 'name', sortOrder: 'desc' };
      case 'az':
      case 'distance':
      default:
        return { sortBy: 'name', sortOrder: 'asc' };
    }
  }

  private resolveTypeFilter(): string | undefined {
    if (this.activeFilter === 'All') {
      return undefined;
    }

    return this.activeFilter;
  }

  private normalizeSearchQuery(): string | undefined {
    const query = this.searchQuery.trim();
    return query.length > 0 ? query : undefined;
  }

  private updateDistances(): void {
    if (!this.userLocation) {
      return;
    }

    this.objects = this.objects.map((item) => {
      if (item.latitude == null || item.longitude == null) {
        return { ...item, distanceMeters: undefined };
      }

      return {
        ...item,
        distanceMeters: this.getDistanceMeters(
          this.userLocation!.lat,
          this.userLocation!.lng,
          item.latitude,
          item.longitude,
        ),
      };
    });

    this.visibleObjects = [...this.objects];
  }

  private clearDistances(): void {
    this.objects = this.objects.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));
    this.visibleObjects = [...this.objects];
  }

  getDistanceText(item: ObjectView): string | null {
    if (!this.isTracking || !this.userLocation) return null;
    if (!item.latitude || !item.longitude) return null;

    const distanceMeters = this.getDistanceMeters(
      this.userLocation.lat,
      this.userLocation.lng,
      item.latitude,
      item.longitude,
    );

    return this.formatDistance(distanceMeters);
  }

  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const r = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.getDistanceKm(lat1, lng1, lat2, lng2) * 1000;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    void this.loadData();
  }

  setMinRating(rating: number): void {
    this.minRatingFilter = rating;
    this.currentPage = 1;
    void this.loadData();
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.sort-anchor')) {
      this.showSortMenu = false;
      this.showPageSizeMenu = false;
    }
  }

  setSort(option: 'rating' | 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
    this.currentPage = 1;
    void this.loadData();
  }

  sortLabel(): string {
    const map = {
      rating: this.translationService.translate('common.topRated'),
      az: 'A -> Z',
      za: 'Z -> A',
      distance: this.translationService.translate('common.nearest')
    };

    return map[this.sortOption];
  }

  isFavoritePending(objectId: number): boolean {
    return this.favoritePendingIds.has(objectId);
  }

  private patchFavoriteState(objectId: number, isFavorite: boolean, favoriteId?: number): void {
    const applyPatch = (list: ObjectView[]) => {
      list.forEach((object) => {
        if (object.id === objectId) {
          object.isFavorite = isFavorite;
          object.favoriteId = favoriteId;
        }
      });
    };

    applyPatch(this.objects);
    applyPatch(this.visibleObjects);
  }

  toggleFavorite(object: ObjectView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: object
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.favoritePendingIds.has(object.id)) {
      return;
    }

    this.favoritePendingIds.add(object.id);

    this.favoriteStateService.toggle({ type: 'object', entityId: object.id }, object.favoriteId).subscribe({
      next: (state) => {
        this.patchFavoriteState(object.id, state.isFavorite, state.favoriteId);
      },
      error: () => {
        this.favoritePendingIds.delete(object.id);
        this.cdr.detectChanges();
      },
      complete: () => {
        this.favoritePendingIds.delete(object.id);
        this.cdr.detectChanges();
      },
    });
  }

  getMainImage(obj: ObjectView): string {
    const anyObj = obj as ObjectView & { mainImageUrl?: string };
    const mainImageUrl = anyObj.mainImageUrl;

    if (mainImageUrl?.trim()) {
      return mainImageUrl;
    }

    const img = obj.images?.find((image) => image.isMain) ?? obj.images?.[0];
    return img?.url ?? '';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  formatDistance(distanceMeters?: number): string {
    if (distanceMeters == null) return '';

    return distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  isOpenNow(obj: ObjectView): boolean {
    if (!obj.workingHours) return false;

    try {
      const hours = JSON.parse(obj.workingHours) as Record<string, string>;
      const now = new Date();
      const dayNames = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];
      const todayKey = dayNames[now.getDay()];

      const todayHours = hours[todayKey] || hours['pon'];
      if (!todayHours || todayHours === '00:00-24:00') return true;

      const [openStr, closeStr] = todayHours.split('-');
      const current = now.getHours() * 60 + now.getMinutes();
      const openTime = this.timeToMinutes(openStr);
      const closeTime = this.timeToMinutes(closeStr);

      return current >= openTime && current <= closeTime;
    } catch {
      return false;
    }
  }

  viewDetails(obj: ObjectView): void {
    if (obj.objectTypeName?.trim()) {
      this.router.navigate(['/object', obj.id]);
      return;
    }

    this.router.navigate(['/objects']);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
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

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}
