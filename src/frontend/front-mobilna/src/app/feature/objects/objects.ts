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
import { catchError, firstValueFrom, of, Subscription } from 'rxjs';

import {
  ObjectDto,
  ObjectService,
  ObjectView,
} from '../../services/object';
import { AuthService } from '../../services/auth';
import { LocationTrackingService } from '../../services/location-tracking';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ActiveRegionService } from '../../services/active-region';
import { DataCacheService } from '../../services/data-cache';

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
  private favoritesLoaded = false;
  private loadToken = 0;
  private hasInitializedLanguageWatcher = false;
  private lastLanguage = 'sr';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly listStateKey = 'objects-list-state';
  private readonly returnFlagKey = 'objects-return-from-detail';
  private readonly locationSubs = new Subscription();
  private readonly handleFavoriteObject = (event: Event & { detail?: ObjectView }) => {
    const obj = event.detail;
    if (obj) this.toggleFavorite(obj, new Event('click'));
  };
  private readonly groupedTypeMap: Record<string, string[]> = {
    'hrana i pice': ['restaurant', 'kafana'],
    pumpe: ['gas_station'],
    smestaj: [
      'hotel',
      'apartment',
      'resort',
      'hostel',
      'motel',
      'villa',
      'apartman',
      'smestaj',
      'accommodation',
      'guesthouse',
      'guest house',
      'pansion',
      'bungalow',
      'camp',
      'kamp',
    ],
    soping: ['shop', 'mall'],
    bolnice: ['hospital', 'clinic', 'pharmacy'],
    hotel: ['hotel'],
    restoran: ['restaurant'],
  };

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

        this.cdr.detectChanges();
      })
    );

    this.route.data.subscribe((routeData) => {
      const type = routeData['type'] as string | null;
      this.pageTitle = this.translationService.translate('object.listTitle');
    
      this.hideTypeFilters = Boolean(type);

      if (sessionStorage.getItem(this.returnFlagKey)) {
        sessionStorage.removeItem(this.returnFlagKey);
        this.restoreListState();
      }

      if (type) {
        this.activeFilter = type;
      }
    
      void this.loadData();
    });

    window.addEventListener('favorite-object', this.handleFavoriteObject);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  private saveListState(): void {
    sessionStorage.setItem(this.listStateKey, JSON.stringify({
      searchQuery: this.searchQuery,
      activeFilter: this.activeFilter,
      minRatingFilter: this.minRatingFilter,
      sortOption: this.sortOption,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
    }));
  }
  
  private restoreListState(): boolean {
    const raw = sessionStorage.getItem(this.listStateKey);
    if (!raw) return false;
  
    try {
      const state = JSON.parse(raw);
  
      this.searchQuery = state.searchQuery ?? '';
      this.activeFilter = state.activeFilter ?? 'All';
      this.minRatingFilter = state.minRatingFilter ?? 0;
      this.sortOption = state.sortOption ?? 'rating';
      this.currentPage = state.currentPage ?? 1;
      this.pageSize = state.pageSize ?? 8;
  
      return true;
    } catch {
      return false;
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleObjects();
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

      const allObjects = await this.fetchAllObjects();

      if (currentToken !== this.loadToken) return;

      this.objects = allObjects.map((obj) => {
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

      this.favoriteStateService.applyToList(this.objects, (object) => ({
        type: 'object',
        entityId: object.id,
      }));

      this.refreshVisibleObjects();

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
      if (currentToken !== this.loadToken) return;
      console.error(err);
      this.objects = [];
      this.visibleObjects = [];
      this.totalCount = 0;
      this.hasNextPage = false;
      this.errorMessage = this.translationService.translate('object.loadError');
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  private async fetchAllObjects(): Promise<ObjectDto[]> {
    const regionId = this.activeRegionService.getActiveRegionId() ?? 0;
    const cacheKey = `objects:r${regionId}`;
    const cached = this.dataCacheService.get<ObjectDto[]>(cacheKey);
    if (cached) return cached;

    const all: ObjectDto[] = [];
    let page = 1;
    const batchSize = 100;

    while (true) {
      const response = await firstValueFrom(
        this.objectService.getPage({
          page,
          pageSize: batchSize,
          search: undefined,
          type: undefined,
          minRating: undefined,
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );

      const items = response.items ?? [];
      all.push(...items);

      if (items.length < batchSize) break;
      page++;
    }

    this.dataCacheService.set(cacheKey, all);
    return all;
  }


  private refreshVisibleObjects(): void {
    let list = [...this.objects];

    if (this.searchQuery?.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(obj =>
        obj.name?.toLowerCase().includes(q) ||
        (obj.description ?? '').toLowerCase().includes(q)
      );
    }

    if (this.activeFilter !== 'All' && this.activeFilter) {
      list = list.filter((obj) => this.matchesActiveFilter(obj));
    }

    if (this.minRatingFilter > 0) {
      list = list.filter(obj => (obj.averageRating ?? 0) >= this.minRatingFilter);
    }

    switch (this.sortOption) {
      case 'rating':
        list.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
        break;
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
      this.visibleObjects = [];
      this.cdr.detectChanges();
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    this.currentPage = Math.min(this.currentPage, totalPages);
    this.hasNextPage = this.currentPage < totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.visibleObjects = list.slice(startIndex, startIndex + this.pageSize);

    this.favoriteStateService.applyToList(this.visibleObjects, (object) => ({
      type: 'object',
      entityId: object.id,
    }));

    this.cdr.detectChanges();
  }

  private matchesActiveFilter(obj: ObjectView): boolean {
    const filterKey = this.normalizeTypeKey(this.activeFilter);
    if (!filterKey || filterKey === 'all') {
      return true;
    }

    const rawType =
      obj.objectTypeName ??
      ((obj as unknown as Record<string, unknown>)['type'] as string) ??
      '';

    const objectType = this.normalizeTypeKey(rawType);
    const markerType = this.resolveObjectMarkerType(rawType);

    if (!objectType && !markerType) {
      return false;
    }

    const candidates = this.groupedTypeMap[filterKey] ?? [filterKey];
    return candidates.some((candidate) => {
      const normalizedCandidate = this.normalizeTypeKey(candidate);
      return (
        this.typeMatchesCandidate(objectType, normalizedCandidate) ||
        this.typeMatchesCandidate(markerType, normalizedCandidate)
      );
    });
  }

  private typeMatchesCandidate(objectType: string, candidate: string): boolean {
    if (!objectType || !candidate) {
      return false;
    }

    const normalizedCandidate = this.normalizeTypeKey(candidate);
    return (
      objectType === normalizedCandidate ||
      objectType.includes(normalizedCandidate) ||
      normalizedCandidate.includes(objectType)
    );
  }

  private normalizeTypeKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private resolveObjectMarkerType(value: string): string {
    const normalized = this.normalizeTypeKey(value);

    if (
      normalized.includes('pumpa') ||
      normalized.includes('benzin') ||
      normalized.includes('benzinska') ||
      normalized.includes('pump') ||
      normalized.includes('gas') ||
      normalized.includes('fuel') ||
      normalized.includes('petrol')
    ) {
      return 'gas_station';
    }

    if (
      normalized.includes('pekara') ||
      normalized.includes('bakery') ||
      normalized.includes('fast food') ||
      normalized.includes('fastfood') ||
      normalized.includes('rostilj') ||
      normalized.includes('grill') ||
      normalized.includes('picerija') ||
      normalized.includes('slasticarnica') ||
      normalized.includes('poslasticarnica') ||
      normalized.includes('restoran') ||
      normalized.includes('restaurant') ||
      normalized.includes('ristorante') ||
      normalized.includes('konoba') ||
      normalized.includes('bistro') ||
      normalized.includes('pizzeria') ||
      normalized.includes('taverna')
    ) {
      return 'restaurant';
    }

    if (
      normalized.includes('drogerija') ||
      normalized.includes('apoteka') ||
      normalized.includes('pharmacy')
    ) {
      return 'pharmacy';
    }

    if (
      normalized.includes('poliklinika') ||
      normalized.includes('klinika') ||
      normalized.includes('clinic') ||
      normalized.includes('dom zdravlja')
    ) {
      return 'clinic';
    }

    if (normalized.includes('bolnica') || normalized.includes('hospital')) {
      return 'hospital';
    }

    if (
      normalized.includes('supermarket') ||
      normalized.includes('suvenir') ||
      normalized.includes('prodavnica') ||
      normalized.includes('shop') ||
      normalized.includes('butik') ||
      normalized.includes('market') ||
      normalized.includes('store') ||
      normalized.includes('storefront')
    ) {
      return 'shop';
    }

    if (
      normalized.includes('trzni') ||
      normalized.includes('trznica') ||
      normalized.includes('mall') ||
      normalized.includes('shopping') ||
      normalized.includes('outlet')
    ) {
      return 'mall';
    }

    if (
      normalized.includes('lounge') ||
      normalized.includes('kafana') ||
      normalized.includes('bar') ||
      normalized.includes('cafe') ||
      normalized.includes('cafeteria') ||
      normalized.includes('kafic') ||
      normalized.includes('pub') ||
      normalized.includes('club') ||
      normalized.includes('klub') ||
      normalized.includes('winery') ||
      normalized.includes('vinarija')
    ) {
      return 'kafana';
    }

    if (
      normalized.includes('hotel') ||
      normalized.includes('albergo') ||
      normalized.includes('resort') ||
      normalized.includes('hostel') ||
      normalized.includes('motel')
    ) {
      return 'hotel';
    }

    if (
      normalized.includes('apartman') ||
      normalized.includes('apartment') ||
      normalized.includes('villa') ||
      normalized.includes('pansion') ||
      normalized.includes('guesthouse') ||
      normalized.includes('guest house')
    ) {
      return 'apartment';
    }

    return '';
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
    this.refreshVisibleObjects();
  }

  private clearDistances(): void {
    this.objects = this.objects.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));
    this.refreshVisibleObjects();
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
    this.saveListState();
    this.refreshVisibleObjects();
  }

  setMinRating(rating: number): void {
    this.minRatingFilter = rating;
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleObjects();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleObjects();
  }

  prevPage(): void {
    if (this.currentPage === 1) return;
    this.currentPage--;
    this.saveListState();
    this.refreshVisibleObjects();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  nextPage(): void {
    if (!this.hasNextPage) return;
    this.currentPage++;
    this.saveListState();
    this.refreshVisibleObjects();
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
    this.saveListState();
    this.refreshVisibleObjects();
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
    this.saveListState();
    sessionStorage.setItem(this.returnFlagKey, 'true');

    this.router.navigate(['/object', obj.id], {
      queryParams: { returnUrl: this.router.url }
    });
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
    this.locationSubs.unsubscribe();
    window.removeEventListener('favorite-object', this.handleFavoriteObject);
  }
}
