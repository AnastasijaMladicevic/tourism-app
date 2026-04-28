import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { LocationTrackingService } from '../../services/location-tracking';
import { DestinationService } from '../../services/destination';
import { ActivityService } from '../../services/activity';
import { EventService } from '../../services/event';
import { ObjectService } from '../../services/object';

interface UnifiedSearchItem {
  id: number;
  name: string;
  typeId: number;
  type: 'destination' | 'activity' | 'event' | 'object' | string;
  typeName?: string;
  mainImageUrl?: string;
  images?: ImageDto[];
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  description?: string;
  isActive?: boolean;
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

  mode: 'recommended' | 'popular' | 'search' = 'recommended';
  private readonly fetchPageSize = 100;
  private readonly maxFetchPages = 50;
  private imageCache = new Map<string, ImageDto[]>();
  constructor(
    private destinationService: DestinationService,
    private activityService: ActivityService,
    private eventService: EventService,
    private objectService: ObjectService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService,
    private locationTrackingService: LocationTrackingService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    const state = history.state as any;

    this.mode = state?.mode ?? 'recommended';

    const items = state?.items ?? [];

    this.items = items.map((x: any) => this.mapHomeCardToView(x));

    void this.refreshVisibleItems();

    this.isLoading = false;
  }
  private mapHomeCardToView(card: any): View {
    return {
      id: card.itemId,
      name: card.title,
      type: card.itemType,
      typeName: card.typeName,
      typeId: 0,
      mainImageUrl: card.imageUrl,
      description: card.description ?? '',
      latitude: undefined,
      longitude: undefined,
      distanceMeters: undefined,
      isActive: true,
      isFavorite: card.isFavorite,
      favoriteId: card.favoriteId
    };
  }
  private async loadFullItems(items: UnifiedSearchItem[]): Promise<void> {
    const resolved = await Promise.all(
      items.map(item => this.resolveItem(item))
    );

    this.items = resolved.map(x => ({
      ...x,
      isFavorite: false
    }));

    await this.refreshVisibleItems();

    this.isLoading = false;
    this.cdr.detectChanges();
  }
  get filtered(): View[] {
    let list = [...this.items];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(x => x.name?.toLowerCase().includes(q));
    }

    if (this.activeFilter !== 'All') {
      const f = this.activeFilter.toLowerCase();
      list = list.filter(x => (x.type ?? '').toLowerCase() === f);
    }

    switch (this.sortOption) {
      case 'az':
        list.sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '')
        );
        break;

      case 'za':
        list.sort((a, b) =>
          (b.name ?? '').localeCompare(a.name ?? '')
        );
        break;

      case 'distance':
        list.sort((a, b) =>
          (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999)
        );
        break;

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

        default:
          full = item;
      }

      return {
        ...item,
        ...full,
        isFavorite: false
      };

    } catch {
      return {
        ...item,
        isFavorite: false
      };
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
  private getImageKey(item: View): string {
    return `${item.type}-${item.id}`;
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
  toggleFavorite(item: View, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.items = this.items.map(x =>
      x.id === item.id
        ? { ...x, isFavorite: !x.isFavorite }
        : x
    );
  }
  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    void this.refreshVisibleItems();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    void this.refreshVisibleItems();
  }
  viewDetails(item: View): void {
    this.router.navigate(['/locality', item.id]);
  }
  getMainImage(item: View): string {
    if (item.images && item.images.length > 0) {
      const mainImage = item.images.find((image) => image.isMain);
      return mainImage?.url || item.images[0].url;
    }

    return this.item?.mainImageUrl || '';
  }
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  private extractUniqueTypes(items: View[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    items.forEach((item) => {
      if (item.type) {
        map.set(item.type, {
          id: item.typeId,
          name: item.type,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  async loadData(): Promise<void> {
    this.isLoading = true;

    try {
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
    const [dest, act, evt, obj] = await Promise.all([
      firstValueFrom(this.destinationService.getAll()),
      firstValueFrom(this.activityService.getAll()),
      firstValueFrom(this.eventService.getAll()),
      firstValueFrom(this.objectService.getAll()),
    ]);

    const all = [
      ...dest.map(x => this.mapDestination(x)),
      ...act.map(x => this.mapActivity(x)),
      ...evt.map(x => this.mapEvent(x)),
      ...obj.map(x => this.mapObject(x)),
    ];

    // "popular" logika -> nema backend, pa simulacija
    return all
      .sort((a: any, b: any) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, 20);
  }
  private async fetchSearch(query: string): Promise<UnifiedSearchItem[]> {
    const q = query?.trim().toLowerCase();
    if (!q) return [];

    const [dest, act, evt, obj] = await Promise.all([
      firstValueFrom(this.destinationService.getAll()),
      firstValueFrom(this.activityService.getAll()),
      firstValueFrom(this.eventService.getAll()),
      firstValueFrom(this.objectService.getAll()),
    ]);

    const all = [
      ...dest.map(x => this.mapDestination(x)),
      ...act.map(x => this.mapActivity(x)),
      ...evt.map(x => this.mapEvent(x)),
      ...obj.map(x => this.mapObject(x)),
    ];

    return all.filter(x =>
      (x.name?.toLowerCase().includes(q)) ||
      (x.description?.toLowerCase().includes(q)) ||
      (x.type?.toLowerCase().includes(q))
    );
  }
  private normalizeItem(raw: any): UnifiedSearchItem {
    return {
      id: Number(raw.id ?? raw.Id ?? 0),
      name: String(raw.name ?? raw.Name ?? ''),
      typeId: Number(raw.typeId ?? raw.TypeId ?? 0),
      type: String(raw.type ?? 'object'),
      mainImageUrl: raw.mainImageUrl ?? raw.MainImageUrl,
      latitude: raw.latitude ?? raw.Latitude,
      longitude: raw.longitude ?? raw.Longitude,
      distanceMeters: raw.distanceMeters ?? raw.DistanceMeters,
      description: raw.description ?? raw.Description,
      isActive: raw.isActive ?? true,
      images: raw.images ?? raw.Images ?? []
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
  private async fetchAllItems(): Promise<UnifiedSearchItem[]> {
    const [dest, act, ev, obj] = await Promise.all([
      firstValueFrom(this.destinationService.getAll()),
      firstValueFrom(this.activityService.getAll()),
      firstValueFrom(this.eventService.getAll()),
      firstValueFrom(this.objectService.getAll()),
    ]);

    const normalized: UnifiedSearchItem[] = [
      ...dest.map(x => this.mapDestination(x)),
      ...act.map(x => this.mapActivity(x)),
      ...ev.map(x => this.mapEvent(x)),
      ...obj.map(x => this.mapObject(x)),
    ];

    return normalized;
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

  private async fetchEvents(): Promise<UnifiedSearchItem[]> {
    const res = await firstValueFrom(this.eventService.getAll());
    return this.toArray(res).map(x => this.mapEvent(x));
  }
  private mapDestination(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'destination',
      typeName: x.destinationTypeName,
      description: x.description ?? x.destinationTypeName,
      typeId: x.destinationTypeId,
      latitude: x.latitude,
      longitude: x.longitude,
      images: x.images,
    };
  }
  private mapActivity(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'activity',
      typeId: x.activityTypeId,
      typeName: x.activityTypeName,
      description: x.description ?? '',
      latitude: x.latitude,
      longitude: x.longitude,
      images: x.images,
    };
  }
  private mapEvent(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'event',
      typeId: x.eventTypeId,
      latitude: x.latitude,
      longitude: x.longitude,
      typeName: x.activityTypeName,
      description: x.description ?? '',
      images: x.images,
    };
  }
  private mapObject(x: any): UnifiedSearchItem {
    return {
      id: x.id,
      name: x.name,
      type: 'object',
      typeId: x.objectTypeId,
      latitude: x.latitude,
      typeName: x.objectTypeName,
      longitude: x.longitude,
      images: x.images,
      mainImageUrl: x.mainImageUrl,
      description: x.description
    };
  }
}