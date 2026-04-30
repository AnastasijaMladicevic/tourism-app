import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of } from 'rxjs';
import { LocationTrackingService } from '../../services/location-tracking';
import { DestinationDto, DestinationService } from '../../services/destination';
import { AuthService } from '../../services/auth';
import { FavoriteStateService } from '../../services/favorite-state';
import { ImageService } from '../../services/image';

export interface DestinationView extends DestinationDto {
  distanceMeters?: number;
  isFavorite: boolean;
  favoriteId?: number;
}

@Component({
  selector: 'app-destinations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './destinations.html',
  styleUrls: ['./destinations.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class DestinationsComponent implements OnInit {
  searchQuery = '';
  activeFilter = 'All';
  sortOption: 'az' | 'za' | 'distance' = 'az';
  showSortMenu = false;
  isLoading = true;
  errorMessage = '';
  currentPage = 1;
  pageSize = 8;
  hasNextPage = false;
  totalCount = 0;
  destinationTypes: { id: number; name: string }[] = [];
  destinations: DestinationView[] = [];
  visibleDestinations: DestinationView[] = [];
  private readonly favoritePendingIds = new Set<number>();
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  private readonly fetchPageSize = 100;
  private readonly maxFetchPages = 50;
  private readonly imageCache = new Map<number, DestinationDto['images']>();

  constructor(
    private router: Router,
    private destinationService: DestinationService,
    private authService: AuthService,
    private favoriteStateService: FavoriteStateService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService,
    private locationTrackingService: LocationTrackingService
  ) { }

  ngOnInit(): void {
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
      this.refreshVisibleDestinations();
      this.cdr.detectChanges();
    });
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      if (this.authService.isLoggedIn()) {
        await firstValueFrom(
          this.favoriteStateService
            .loadFavorites(true)
            .pipe(catchError(() => of(new Map<string, number>()))),
        );
      }

      const destinations = await this.fetchAllDestinations();

      this.destinations = destinations.map((destination) => ({
        ...destination,
        images: this.imageCache.get(destination.id) ?? [],
        isFavorite: Boolean(destination.isFavorite),
        favoriteId: destination.favoriteId,
      }));
      this.favoriteStateService.applyToList(this.destinations, (destination) => ({
        type: 'destination',
        entityId: destination.id,
      }));
      this.destinationTypes = this.extractUniqueTypes(this.destinations);
      this.updateDistances();
      await this.refreshVisibleDestinations();


      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
      console.error(err);
      this.destinations = [];
      this.visibleDestinations = [];
      this.totalCount = 0;
      this.hasNextPage = false;
      this.errorMessage = 'Failed to load destinations.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  private updateDistances(): void {
    if (!this.userLocation) return;

    this.destinations = this.destinations.map(a => {
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
    this.destinations = this.destinations.map(a => ({
      ...a,
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
    const R = 6371; // km
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
    void this.refreshVisibleDestinations();
  }
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    void this.refreshVisibleDestinations();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    void this.refreshVisibleDestinations();
  }

  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    void this.refreshVisibleDestinations();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    void this.refreshVisibleDestinations();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('.sort-anchor')) {
      this.showSortMenu = false;
    }
  }

  get filtered(): DestinationView[] {
    let list = [...this.destinations];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      list = list.filter((destination) => destination.name.toLowerCase().includes(query));
    }

    if (this.activeFilter !== 'All') {
      const activeType = this.activeFilter.trim().toLowerCase();
      list = list.filter(
        (destination) => destination.destinationTypeName?.trim().toLowerCase() === activeType,
      );
    }

    switch (this.sortOption) {
      case 'az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'za':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'distance':
        list.sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
        break;
    }

    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  setSort(option: 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
    void this.refreshVisibleDestinations();
  }

  sortLabel(): string {
    const map = { az: 'A -> Z', za: 'Z -> A', distance: 'Nearest' };
    return map[this.sortOption];
  }

  toggleFavorite(destination: DestinationView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.favoritePendingIds.has(destination.id)) {
      return;
    }

    this.favoritePendingIds.add(destination.id);

    this.favoriteStateService
      .toggle({ type: 'destination', entityId: destination.id }, destination.favoriteId)
      .subscribe({
        next: (state) => {
          this.patchFavoriteState(destination.id, state.isFavorite, state.favoriteId);
        },
        error: () => {
          this.favoritePendingIds.delete(destination.id);
          this.cdr.detectChanges();
        },
        complete: () => {
          this.favoritePendingIds.delete(destination.id);
          this.cdr.detectChanges();
        },
      });
  }

  isFavoritePending(destinationId: number): boolean {
    return this.favoritePendingIds.has(destinationId);
  }

  getMainImage(destination: DestinationView): string {
    if (destination.images && destination.images.length > 0) {
      const mainImage = destination.images.find((image) => image.isMain);
      return mainImage?.url ?? destination.images[0].url;
    }

    return '';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  formatDistance(km?: number): string {
    if (km == null) return '';
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
  }

  viewDetails(destination: DestinationView): void {
    this.router.navigate(['/destination', destination.id]);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  private async fetchAllDestinations(): Promise<DestinationDto[]> {
    const allDestinations: DestinationDto[] = [];
    const seenIds = new Set<number>();

    for (let page = 1; page <= this.maxFetchPages; page++) {
      const response = await firstValueFrom(
        this.destinationService.getAll({
          page,
          pageSize: this.fetchPageSize,
        }),
      );
      const items = this.toArray<DestinationDto>(response).map((destination) =>
        this.normalizeDestination(destination),
      );

      const newItems = items.filter((item) => {
        if (seenIds.has(item.id)) {
          return false;
        }

        seenIds.add(item.id);
        return true;
      });

      if (!newItems.length) {
        break;
      }

      allDestinations.push(...newItems);

      if (items.length < this.fetchPageSize) {
        break;
      }
    }

    return allDestinations;
  }

  private async refreshVisibleDestinations(): Promise<void> {
    const filteredDestinations = this.filtered;
    this.totalCount = filteredDestinations.length;

    if (this.totalCount === 0) {
      this.currentPage = 1;
      this.hasNextPage = false;
      this.visibleDestinations = [];
      this.cdr.detectChanges();
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    this.currentPage = Math.min(this.currentPage, totalPages);
    this.hasNextPage = this.currentPage < totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageItems = filteredDestinations.slice(startIndex, startIndex + this.pageSize);

    this.visibleDestinations = await Promise.all(
      pageItems.map(async (destination) => ({
        ...destination,
        images: await this.getDestinationImages(destination.id),
      })),
    );
    this.favoriteStateService.applyToList(this.visibleDestinations, (destination) => ({
      type: 'destination',
      entityId: destination.id,
    }));

    this.cdr.detectChanges();
  }

  private patchFavoriteState(destinationId: number, isFavorite: boolean, favoriteId?: number): void {
    const applyPatch = (list: DestinationView[]) => {
      list.forEach((destination) => {
        if (destination.id === destinationId) {
          destination.isFavorite = isFavorite;
          destination.favoriteId = favoriteId;
        }
      });
    };

    applyPatch(this.destinations);
    applyPatch(this.visibleDestinations);
  }

  private async getDestinationImages(destinationId: number): Promise<DestinationDto['images']> {
    const cachedImages = this.imageCache.get(destinationId);
    if (cachedImages) {
      return cachedImages;
    }

    try {
      const images = (await firstValueFrom(this.imageService.getForDestination(destinationId))) ?? [];
      this.imageCache.set(destinationId, images);
      return images;
    } catch {
      this.imageCache.set(destinationId, []);
      return [];
    }
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

  private normalizeDestination(raw: DestinationDto): DestinationDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      destinationTypeId: Number(dto['destinationTypeId'] ?? dto['DestinationTypeId'] ?? 0),
      destinationTypeName: String(
        dto['destinationTypeName'] ?? dto['DestinationTypeName'] ?? '',
      ),
      images: ((dto['images'] ?? dto['Images'] ?? []) as DestinationDto['images']) || [],
      isFavorite: Boolean(dto['isFavorite'] ?? dto['IsFavorite'] ?? false),
      favoriteId: this.readOptionalNumber(dto, ['favoriteId', 'FavoriteId']),
    };
  }

  private readOptionalNumber(
    obj: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) continue;

      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }

    return undefined;
  }

  private extractUniqueTypes(destinations: DestinationView[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    destinations.forEach((destination) => {
      if (destination.destinationTypeName) {
        map.set(destination.destinationTypeName, {
          id: destination.destinationTypeId,
          name: destination.destinationTypeName,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}
