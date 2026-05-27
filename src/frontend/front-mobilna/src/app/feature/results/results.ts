import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { LocationTrackingService } from '../../services/location-tracking';
import { DestinationService } from '../../services/destination';
import { ActivityService } from '../../services/activity';
import { EventService } from '../../services/event';
import { ObjectService } from '../../services/object';
import { LocalityService } from '../../services/locality';
import { PendingActionService } from '../../services/pending-action';
import { FavoriteStateService, FavoriteTarget } from '../../services/favorite-state';

interface UnifiedSearchItem {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  isActive?: boolean;
  averageRating?: number;
  reviewCount?: number;
  typeId: number;
  type: 'destination' | 'activity' | 'event' | 'object' | 'locality' | string;
  typeName?: string;
  location?: string;
  date?: string;
  time?: string;
  attending?: string;
}

export interface View extends UnifiedSearchItem {
  isFavorite: boolean;
  favoriteId?: number;
}
@Component({
  selector: 'app-results',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class ResultsComponent implements OnInit {
  searchQuery = '';
  currentPage = 1;
  isLoading = true;
  errorMessage = '';
  activeFilter = 'All';
  sortOption: 'az' | 'za' | 'distance' = 'az';
  totalCount = 0;
  hasNextPage = false;
  pageSize = 8;
  items: View[] = [];
  visibleItems: View[] = [];
  itemTypes: { id: number; name: string }[] = [];
  showSortMenu = false;
  images: ImageDto[] = [];
  item: UnifiedSearchItem | null = null;
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  recommended: UnifiedSearchItem[] = [];
  popular: UnifiedSearchItem[] = [];
  searchResults: UnifiedSearchItem[] = [];
  private readonly favoritePendingKeys = new Set<string>();

  mode: 'recommended' | 'popular' | 'search' = 'recommended';
  private imageCache = new Map<string, ImageDto[]>();
  constructor(
    private destinationService: DestinationService,
    private activityService: ActivityService,
    private eventService: EventService,
    private objectService: ObjectService,
    private localityService: LocalityService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService,
    private locationTrackingService: LocationTrackingService,
    private pendingActionService: PendingActionService,
    private favoriteStateService: FavoriteStateService
  ) { }
  @ViewChild('top') top!: ElementRef;
  ngOnInit(): void {
    const state = history.state as any;

    this.mode = state?.mode ?? 'recommended';
    const rawItems = state?.items ?? [];

    const normalized = rawItems.map((x: any) => this.normalizeFromHome(x));
    this.locationTrackingService.trackingEnabled$.subscribe(enabled => {
      this.isTracking = enabled;

      if (!enabled) {
        this.clearDistances();
      } else {
        this.updateDistances();
        this.cdr.detectChanges();
      }
    });

    this.locationTrackingService.location$.subscribe(loc => {
      this.userLocation = loc
        ? { lat: loc.latitude, lng: loc.longitude }
        : null;

      if (this.userLocation) {
        this.updateDistances();
      } else {
        this.clearDistances();
      }
      this.refreshVisibleItems();
      this.cdr.detectChanges();
    });
    this.loadResolvedItems(normalized);
    window.addEventListener('favorite-object', (event: any) => {
      const obj = event.detail;
      if (obj) {
        this.toggleFavorite(obj, new Event('click'));
      }
    });
    this.cdr.detectChanges();
  }
  private async loadResolvedItems(items: UnifiedSearchItem[]): Promise<void> {
    this.isLoading = true;

    try {
      if (this.authService.isLoggedIn()) {
        await firstValueFrom(
          this.favoriteStateService.loadFavorites(true).pipe(catchError(() => of(new Map<string, number>()))),
        );
      }

      const resolved = await Promise.all(
        items.map(item => this.resolveItem(item))
      );
      this.items = resolved;
      this.applyFavoriteState();
      this.itemTypes = this.extractUniqueTypes(this.items);
      this.updateDistances();
      await this.refreshVisibleItems();

    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  private normalizeFromHome(x: any): UnifiedSearchItem {
    return {
      id: x.itemId ?? x.id ?? 0,

      name: x.name ?? x.title ?? '',

      description: x.description ?? '',

      mainImageUrl: x.mainImageUrl ?? x.imageUrl,

      type: x.type ?? x.itemType ?? 'object',

      typeId: x.typeId ?? x.destinationTypeId ?? x.activityTypeId ?? x.eventTypeId ?? x.objectTypeId ?? 0,

      typeName: (x.destinationTypeName ??
        x.activityTypeName ??
        x.eventTypeName ??
        x.objectTypeName ??
        x.localityTypeName ??
        x.typeName ??
        '').trim(),

      location: x.location ?? x.localityName ?? x.destinationName,
      latitude: x.latitude,
      longitude: x.longitude,

      averageRating: this.parseRating(x.ratingText),
      reviewCount: this.parseReviewCount(x.reviewCount),

      isActive: x.isActive ?? true
    };
  }
  private parseRating(text?: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(/([0-9.]+)/);
    return match ? Number(match[1]) : undefined;
  }

  private parseReviewCount(text?: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(/\((\d+)/);
    return match ? Number(match[1]) : undefined;
  }
  get filtered(): View[] {
    let list = [...this.items];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(x =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.description || '').toLowerCase().includes(q)
      );
    }

    if (this.activeFilter !== 'All') {
      const filter = this.activeFilter.toLowerCase().trim();

      list = list.filter(x => {
        const candidates = [
          x.typeName,
          (x as any).destinationTypeName,
          (x as any).activityTypeName,
          (x as any).eventTypeName,
          (x as any).objectTypeName,
          (x as any).localityTypeName,
          x.type,
        ]
          .filter(Boolean)
          .map((v: any) => v.toString().toLowerCase().trim());

        return candidates.some(c => c === filter || c.includes(filter) || filter.includes(c));
      });
    }

    switch (this.sortOption) {
      case 'az': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'za': list.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'distance': list.sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999)); break;
    }

    return list;
  }
  get pageTitle(): string {
    switch (this.mode) {
      case 'recommended': return 'Recommended';
      case 'popular': return 'Popular';
      case 'search': return 'Search Results';
    }
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }
  private async resolveItem(item: UnifiedSearchItem): Promise<View> {
    let full: any;

    try {
      switch (item.type) {
        case 'destination':
          full = await firstValueFrom(this.destinationService.getById(item.id));
          break;
        case 'activity':
          full = await firstValueFrom(this.activityService.getById(item.id));
          break;
        case 'event':
          full = await firstValueFrom(this.eventService.getById(item.id));
          break;
        case 'object':
          full = await firstValueFrom(this.objectService.getById(item.id));
          break;
        case 'locality':
          full = await firstValueFrom(this.localityService.getById(item.id));
          break;
        default:
          full = item;
      }

      const typeName = this.resolveTypeName(item.type, full);

      return {
        ...item,
        ...full,
        typeName,
        location: this.resolveLocation(item.type, full, item.location),
        isFavorite: false
      };

    } catch {
      return { ...item, isFavorite: false };
    }
  }

  private resolveTypeName(type: string, full: any): string {
    switch (type) {
      case 'destination':
        return full?.destinationTypeName ?? full?.typeName ?? 'Destinacija';
      case 'activity':
        return full?.activityTypeName ?? full?.typeName ?? 'Aktivnost';
      case 'event':
        return full?.eventTypeName ?? full?.typeName ?? 'Događaj';
      case 'object':
        return full?.objectTypeName ?? full?.typeName ?? 'Objekat';
      case 'locality':
        return full?.localityTypeName ?? full?.typeName ?? 'Lokalitet';
      default:
        return full?.typeName ?? type;
    }
  }
  private resolveLocation(type: string, full: any, fallback?: string): string | undefined {
    switch (type) {
      case 'destination':
        return full?.regionName ?? fallback;
      case 'locality':
        return [full?.destinationName, full?.regionName].filter(Boolean).join(', ') || fallback;
      case 'activity':
        return [full?.destinationName, full?.localityName, full?.regionName].filter(Boolean).join(', ') || fallback;
      default:
        return fallback;
    }
  }
  private updateDistances(): void {
    if (!this.userLocation) return;

    this.items = this.items.map(a => {
      if (a.latitude == null || a.longitude == null) {
        return { ...a, distanceMeters: undefined };
      }

      return {
        ...a,
        distanceMeters: this.getDistanceKm(
          this.userLocation!.lat,
          this.userLocation!.lng,
          a.latitude,
          a.longitude
        )
      };
    });
  }
  private clearDistances(): void {
    this.items = this.items.map(item => ({
      ...item,
      distanceMeters: undefined
    }));
  }
  getDistanceText(item: any): string | null {
    if (!this.isTracking || !this.userLocation) return null;
    if (!item.latitude || !item.longitude) return null;

    const km = this.getDistanceKm(
      this.userLocation.lat,
      this.userLocation.lng,
      item.latitude,
      item.longitude
    );

    return km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km.toFixed(1)} km`;
  }
  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    void this.refreshVisibleItems();
  }

  consumeCardAction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if ('stopImmediatePropagation' in event && typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  isFavoriteable(item: UnifiedSearchItem | View): boolean {
    return this.favoriteTarget(item) !== null;
  }

  isFavoritePending(itemId: number, itemType: string): boolean {
    return this.favoritePendingKeys.has(this.favoriteKey(itemType, itemId));
  }

  toggleFavorite(item: View, event: Event): void {
    this.consumeCardAction(event);

    const target = this.favoriteTarget(item);
    if (!target) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: item
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    const pendingKey = this.favoriteKey(target.type, target.entityId);
    if (this.favoritePendingKeys.has(pendingKey)) {
      return;
    }

    this.favoritePendingKeys.add(pendingKey);
    this.favoriteStateService
      .toggle(target, item.favoriteId)
      .subscribe({
        next: (state) => {
          this.patchFavoriteState(target.type, target.entityId, state.isFavorite, state.favoriteId);
        },
        error: () => {
          this.favoritePendingKeys.delete(pendingKey);
          this.cdr.detectChanges();
        },
        complete: () => {
          this.favoritePendingKeys.delete(pendingKey);
          this.cdr.detectChanges();
        },
      });
  }
  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    void this.refreshVisibleItems();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    void this.refreshVisibleItems();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
  viewDetails(item: View): void {
    const routes: Record<string, string> = {
      destination: '/destination',
      activity: '/activity',
      event: '/event',
      object: '/object',
      locality: '/locality'
    };

    const baseRoute = routes[item.type];

    if (!baseRoute) {
      console.warn('Unknown route type:', item.type);
      return;
    }

    this.router.navigate([baseRoute, item.id]);
  }
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  private extractUniqueTypes(items: View[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    items.forEach((item, index) => {
      let typeName =
        item.typeName ||
        (item as any).destinationTypeName ||
        (item as any).activityTypeName ||
        (item as any).eventTypeName ||
        (item as any).objectTypeName ||
        (item as any).localityTypeName ||
        item.type ||
        '';

      typeName = typeName.toString().trim();

      if (!typeName || typeName === 'undefined' || typeName === 'null' || typeName.length < 2) {
        console.log(`Item ${index} (${item.name}) - nema typeName`);
        return;
      }

      const displayName = typeName;

      if (!map.has(displayName)) {
        map.set(displayName, {
          id: item.typeId || index + 1000,
          name: displayName
        });
      }
    });

    const result = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }
  async loadData(): Promise<void> {
    this.isLoading = true;

    try {
      if (this.authService.isLoggedIn()) {
        await firstValueFrom(
          this.favoriteStateService.loadFavorites(true).pipe(catchError(() => of(new Map<string, number>()))),
        );
      }

      let items: UnifiedSearchItem[] = [];

      switch (this.mode) {

        case 'recommended':
          items = await this.fetchRecommended();
          break;

        case 'popular':
          items = await this.fetchPopular();
          break;

        case 'search':
          items = await this.fetchSearch(this.searchQuery);
          break;
      }

      this.items = items.map(x => ({
        ...x,
        isFavorite: false
      }));
      this.applyFavoriteState();

      this.updateDistances();
      await this.refreshVisibleItems();

    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  private async fetchRecommended(): Promise<UnifiedSearchItem[]> {
    const [dest, act] = await Promise.all([
      this.fetchDestinations(),
      this.fetchActivities()
    ]);

    return [...dest, ...act];
  }
  private async fetchPopular(): Promise<UnifiedSearchItem[]> {
    const [dest, act, evt, obj, loc] = await Promise.all([
      firstValueFrom(this.destinationService.getAll()),
      firstValueFrom(this.activityService.getAll()),
      firstValueFrom(this.eventService.getAll()),
      firstValueFrom(this.objectService.getAll()),
      firstValueFrom(this.localityService.getAll())
    ]);

    const all = [
      ...dest.map(x => this.mapDestination(x)),
      ...act.map(x => this.mapActivity(x)),
      ...evt.map(x => this.mapEvent(x)),
      ...obj.map(x => this.mapObject(x)),
      ...loc.map(x => this.mapLocality(x)),
    ];

    return all
      .sort((a: any, b: any) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, 20);
  }
  private async fetchSearch(query: string): Promise<UnifiedSearchItem[]> {
    const q = query?.trim().toLowerCase();
    if (!q) return [];

    const [dest, act, evt, obj, loc] = await Promise.all([
      firstValueFrom(this.destinationService.getAll()),
      firstValueFrom(this.activityService.getAll()),
      firstValueFrom(this.eventService.getAll()),
      firstValueFrom(this.objectService.getAll()),
      firstValueFrom(this.localityService.getAll())
    ]);

    const all = [
      ...dest.map(x => this.mapDestination(x)),
      ...act.map(x => this.mapActivity(x)),
      ...evt.map(x => this.mapEvent(x)),
      ...obj.map(x => this.mapObject(x)),
      ...loc.map(x => this.mapLocality(x))
    ];

    return all.filter(x =>
      (x.name?.toLowerCase().includes(q)) ||
      (x.description?.toLowerCase().includes(q)) ||
      (x.type?.toLowerCase().includes(q))
    );
  }
  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];

    const obj = raw as Record<string, unknown>;
    const listKeys = ['items', 'Items', 'data', 'Data', 'results', 'Results', 'value', 'Value'];

    for (const key of listKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }

    return [];
  }
  sortLabel(): string {
    const map = { az: 'A -> Z', za: 'Z -> A', distance: 'Nearest' };
    return map[this.sortOption];
  }
  setSort(option: 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
    void this.refreshVisibleItems();
  }
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    void this.refreshVisibleItems();
  }
  private async refreshVisibleItems(): Promise<void> {
    const filteredItems = this.filtered;
    this.totalCount = filteredItems.length;

    if (this.totalCount === 0) {
      this.currentPage = 1;
      this.hasNextPage = false;
      this.visibleItems = [];
      this.cdr.detectChanges();
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    this.currentPage = Math.min(this.currentPage, totalPages);
    this.hasNextPage = this.currentPage < totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageItems = filteredItems.slice(startIndex, startIndex + this.pageSize);

    this.visibleItems = await Promise.all(
      pageItems.map(async (item) => {
        const images = await this.getItemImages(item);

        return {
          ...item,
          images
        };
      })
    );

    this.cdr.detectChanges();
  }
  private async getItemImages(item: View): Promise<ImageDto[]> {
    const key = `${item.type}-${item.id}`;

    const cached = this.imageCache.get(key);
    if (cached) return cached;

    let images: ImageDto[] = [];

    try {
      switch (item.type) {
        case 'destination':
          images = await firstValueFrom(this.imageService.getForDestination(item.id));
          break;

        case 'activity':
          images = await firstValueFrom(this.imageService.getForActivity(item.id));
          break;

        case 'event':
          images = await firstValueFrom(this.imageService.getForEvent(item.id));
          break;

        case 'object':
          images = await firstValueFrom(this.imageService.getForObject(item.id));
          break;
        case 'locality':
          images = await firstValueFrom(this.imageService.getForLocality(item.id));
          break;
      }
    } catch {
      images = [];
    }

    this.imageCache.set(key, images);
    return images;
  }
  onSearchChange(): void {
    this.currentPage = 1;
    void this.refreshVisibleItems();
  }
  goBack(): void {
    this.router.navigate(['/home']);
  }
  private async fetchDestinations(): Promise<UnifiedSearchItem[]> {
    const res = await firstValueFrom(this.destinationService.getAll());
    return this.toArray(res).map(x => this.mapDestination(x));
  }

  private async fetchActivities(): Promise<UnifiedSearchItem[]> {
    const res = await firstValueFrom(this.activityService.getAll());
    return this.toArray(res).map(x => this.mapActivity(x));
  }

  private mapDestination(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'destination',
      typeId: x.destinationTypeId,
      typeName: x.destinationTypeName || 'Destinacija',
      location: x.regionName,
      description: x.description,
      latitude: x.latitude,
      longitude: x.longitude,
    };
  }

  private mapActivity(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'activity',
      typeId: x.activityTypeId,
      typeName: x.activityTypeName || 'Aktivnost',
      description: x.description,
      latitude: x.latitude,
      longitude: x.longitude,
    };
  }

  private mapEvent(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'event',
      typeId: x.eventTypeId,
      typeName: x.eventTypeName || 'Događaj',
      description: x.description,
      latitude: x.latitude,
      longitude: x.longitude,
    };
  }

  private mapObject(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'object',
      typeId: x.objectTypeId,
      typeName: x.objectTypeName || 'Objekat',
      description: x.description,
      latitude: x.latitude,
      longitude: x.longitude,
      averageRating: x.averageRating,
    };
  }
  private mapLocality(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'locality',
      typeId: x.localityTypeId,
      typeName: x.localityTypeName || 'Locality',
      location: [x.destinationName, x.regionName].filter(Boolean).join(', '),
      description: x.description,
      latitude: x.latitude,
      longitude: x.longitude,
      averageRating: x.averageRating,
    };
  }

  private favoriteTarget(item: UnifiedSearchItem | View): FavoriteTarget | null {
    switch (item.type) {
      case 'destination':
      case 'object':
      case 'activity':
      case 'locality':
        return { type: item.type, entityId: item.id };
      default:
        return null;
    }
  }

  private favoriteKey(itemType: string, itemId: number): string {
    return `${itemType}:${itemId}`;
  }

  private patchFavoriteState(
    itemType: FavoriteTarget['type'],
    itemId: number,
    isFavorite: boolean,
    favoriteId?: number,
  ): void {
    const patch = (list: View[]) =>
      list.map((entry) =>
        entry.type === itemType && entry.id === itemId
          ? { ...entry, isFavorite, favoriteId }
          : entry,
      );

    this.items = patch(this.items);
    this.visibleItems = patch(this.visibleItems);
  }

  private applyFavoriteState(): void {
    this.favoriteStateService.applyToList(this.items, (item) => this.favoriteTarget(item));
  }
}
