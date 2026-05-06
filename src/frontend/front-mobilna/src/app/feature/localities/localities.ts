import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of } from 'rxjs';
import { LocalityDto, LocalityService } from '../../services/locality';
import { AuthService } from '../../services/auth';
import { LocationTrackingService } from '../../services/location-tracking';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';

export interface LocalityView extends LocalityDto {
  isFavorite: boolean;
  favoriteId?: number;
}

@Component({
  selector: 'app-localities',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './localities.html',
  styleUrl: './localities.scss',
})
export class LocalitiesComponent implements OnInit {
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
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  private readonly fetchPageSize = 500;
  private readonly maxFetchPages = 10;
  private readonly favoritePendingIds = new Set<number>();
  constructor(
    private router: Router,
    private localityService: LocalityService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private favoriteStateService: FavoriteStateService,
    private locationTrackingService: LocationTrackingService,
    private pendingActionService: PendingActionService
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
      this.refreshVisibleLocalities();
      this.cdr.detectChanges();
    });
    void this.loadData();
    window.addEventListener('favorite-object', (event: any) => {
      const obj = event.detail;
      if (obj) {
        this.toggleFavorite(obj, new Event('click'));
      }
    });
    this.cdr.detectChanges();
  }
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  private matchesTokens(text: string, query: string): boolean {
    const textTokens = this.tokenize(text);
    const queryTokens = this.tokenize(query);

    return queryTokens.every(q =>
      textTokens.some(t => t.includes(q))
    );
  }
  get filtered(): LocalityView[] {
    let list = [...this.localities];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim();

      list = list.filter((locality) =>
        this.matchesTokens(
          `${locality.name} ${locality.description ?? ''} ${locality.destinationName ?? ''}`,
          query
        )
      );
    }

    if (this.activeFilter !== 'All') {
      const activeType = this.activeFilter.trim().toLowerCase();
      list = list.filter(
        (locality) => locality.localityTypeName?.trim().toLowerCase() === activeType,
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
  private updateDistances(): void {
    if (!this.userLocation) return;

    this.localities = this.localities.map(a => {
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
    this.localities = this.localities.map(a => ({
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
    void this.refreshVisibleLocalities();
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
        payload: locality
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
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
    void this.refreshVisibleLocalities();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    void this.refreshVisibleLocalities();
  }
  viewDetails(locality: LocalityView): void {
    this.router.navigate(['/locality', locality.id]);
  }
  getMainImage(locality: LocalityView): string {
    if (locality.mainImageUrl) {
      return locality.mainImageUrl;
    }

    if (locality.images && locality.images.length > 0) {
      const mainImage = locality.images.find((image) => image.isMain);
      return mainImage?.url || locality.images[0].url;
    }

    return '';
  }
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  private extractUniqueTypes(localities: LocalityView[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    localities.forEach((locality) => {
      if (locality.localityTypeName) {
        map.set(locality.localityTypeName, {
          id: locality.localityTypeId,
          name: locality.localityTypeName,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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
      const localities = await this.fetchAllLocalities();

      this.localities = localities.map((locality) => ({
        ...locality,
        images: locality.images ?? [],
        isFavorite: false,
        favoriteId: undefined,
      }));
      this.favoriteStateService.applyToList(this.localities, (locality) => ({
        type: 'locality',
        entityId: locality.id,
      }));
      this.updateDistances();
      this.localityTypes = this.extractUniqueTypes(this.localities);
      await this.refreshVisibleLocalities();

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
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
  private async fetchAllLocalities(): Promise<LocalityDto[]> {
    const allLocalities: LocalityDto[] = [];
    const seenIds = new Set<number>();

    for (let page = 1; page <= this.maxFetchPages; page++) {
      const response = await firstValueFrom(
        this.localityService.getAll({
          page,
          pageSize: this.fetchPageSize,
        }),
      );
      const items = this.toArray<LocalityDto>(response).map((locality) =>
        this.normalizeLocality(locality),
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

      allLocalities.push(...newItems);

      const totalPages = this.readTotalPages(response);
      if ((totalPages != null && page >= totalPages) || items.length < this.fetchPageSize) {
        break;
      }
    }

    return allLocalities;
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
  private readTotalPages(raw: unknown): number | undefined {
    if (!raw || typeof raw !== 'object') return undefined;

    const obj = raw as Record<string, unknown>;
    const value = obj['totalPages'] ?? obj['TotalPages'];
    if (value == null) return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  sortLabel(): string {
    const map = { az: 'A -> Z', za: 'Z -> A', distance: 'Nearest' };
    return map[this.sortOption];
  }
  setSort(option: 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
    void this.refreshVisibleLocalities();
  }
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    void this.refreshVisibleLocalities();
  }
  private async refreshVisibleLocalities(): Promise<void> {
    const filteredLocalities = this.filtered;
    this.totalCount = filteredLocalities.length;

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
    this.visibleLocalities = filteredLocalities.slice(startIndex, startIndex + this.pageSize);
    this.favoriteStateService.applyToList(this.visibleLocalities, (locality) => ({
      type: 'locality',
      entityId: locality.id,
    }));
    this.cdr.detectChanges();
  }
  onSearchChange(): void {
    this.currentPage = 1;
    void this.refreshVisibleLocalities();
  }
  goBack(): void {
    this.router.navigate(['/home']);
  }
}
