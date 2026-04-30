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
import { ActivityDto, ActivityService } from '../../services/activity';
import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { LocationTrackingService } from '../../services/location-tracking';
import { FavoriteStateService } from '../../services/favorite-state';

export interface ActivityView extends ActivityDto {
  isFavorite: boolean;
  favoriteId?: number;
}

@Component({
  selector: 'app-activities',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './activities.html',
  styleUrl: './activities.scss',
})
export class ActivitiesComponent implements OnInit {
  searchQuery = '';
  currentPage = 1;
  isLoading = true;
  errorMessage = '';
  activeFilter = 'All';
  sortOption: 'az' | 'za' | 'distance' = 'az';
  totalCount = 0;
  hasNextPage = false;
  pageSize = 8;
  activities: ActivityView[] = [];
  visibleActivities: ActivityView[] = [];
  activityTypes: { id: number; name: string }[] = [];
  showSortMenu = false;
  images: ImageDto[] = [];
  activity: ActivityDto | null = null;
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  private readonly fetchPageSize = 100;
  private readonly maxFetchPages = 50;
  private readonly imageCache = new Map<number, ActivityDto['images']>();
  private readonly favoritePendingIds = new Set<number>();
  constructor(
    private router: Router,
    private activityService: ActivityService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService,
    private favoriteStateService: FavoriteStateService,
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
      this.refreshVisibleActivities();
      this.cdr.detectChanges();
    });
    void this.loadData();
  }
  get filtered(): ActivityView[] {
    let list = [...this.activities];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      list = list.filter((activity) => activity.name.toLowerCase().includes(query));
    }

    if (this.activeFilter !== 'All') {
      const activeType = this.activeFilter.trim().toLowerCase();
      list = list.filter(
        (activity) => activity.activityTypeName?.trim().toLowerCase() === activeType,
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
  getDistance(activity: any): number | null {
    const location = this.locationTrackingService.getCurrentLocation();

    if (!this.locationTrackingService.isTrackingEnabled() || !location) {
      return null;
    }

    const R = 6371; // km
    const dLat = this.toRad(activity.latitude - location.latitude);
    const dLng = this.toRad(activity.longitude - location.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(location.latitude)) *
      Math.cos(this.toRad(activity.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
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
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    void this.refreshVisibleActivities();
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
      this.router.navigate(['/login']);
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
    void this.refreshVisibleActivities();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    void this.refreshVisibleActivities();
  }
  viewDetails(activity: ActivityView): void {
    this.router.navigate(['/activity', activity.id]);
  }
  getMainImage(activity: ActivityView): string {
    if (activity.images && activity.images.length > 0) {
      const mainImage = activity.images.find((image) => image.isMain);
      return mainImage?.url || activity.images[0].url;
    }

    return this.activity?.mainImageUrl || '';
  }
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  private extractUniqueTypes(activities: ActivityView[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    activities.forEach((activity) => {
      if (activity.activityTypeName) {
        map.set(activity.activityTypeName, {
          id: activity.activityTypeId,
          name: activity.activityTypeName,
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
      const activities = await this.fetchAllActivities();

      this.activities = activities.map((activity) => ({
        ...activity,
        images: this.imageCache.get(activity.id) ?? [],
        isFavorite: false,
        favoriteId: undefined,
      }));
      this.favoriteStateService.applyToList(this.activities, (activity) => ({
        type: 'activity',
        entityId: activity.id,
      }));
      this.activityTypes = this.extractUniqueTypes(this.activities);
      this.updateDistances();
      await this.refreshVisibleActivities();

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (err) {
      console.error(err);
      this.activities = [];
      this.visibleActivities = [];
      this.totalCount = 0;
      this.hasNextPage = false;
      this.errorMessage = 'Failed to load activities.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  private updateDistances(): void {
    if (!this.userLocation) return;

    this.activities = this.activities.map(a => {
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
    this.activities = this.activities.map(a => ({
      ...a,
      distanceMeters: undefined
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
      activityTypeId: Number(dto['activityTypeId'] ?? dto['ActivityTypeId'] ?? 0),
      activityTypeName: String(dto['activityTypeName'] ?? dto['ActivityTypeName'] ?? ''),
      destinationName: String(dto['destinationName'] ?? dto['DestinationName'] ?? ''),
      images: ((dto['images'] ?? dto['Images'] ?? []) as ActivityDto['images']) || [],
      createdByUserId: Number(dto['createdByUserId'] ?? 0),
      createdAt: String(dto['createdAt'] ?? ''),
      destinationId: Number(dto['destinationId'] ?? 0),
      status: String(dto['status'] ?? ''),
      updatedAt: String(dto['updatedAt'] ?? '')
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
  private async fetchAllActivities(): Promise<ActivityDto[]> {
    const allActivities: ActivityDto[] = [];
    const seenIds = new Set<number>();

    for (let page = 1; page <= this.maxFetchPages; page++) {
      const response = await firstValueFrom(
        this.activityService.getAll({
          page,
          pageSize: this.fetchPageSize,
        }),
      );
      const items = this.toArray<ActivityDto>(response).map((activity) =>
        this.normalizeActivity(activity),
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

      allActivities.push(...newItems);

      if (items.length < this.fetchPageSize) {
        break;
      }
    }

    return allActivities;
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
    void this.refreshVisibleActivities();
  }
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    void this.refreshVisibleActivities();
  }
  private async refreshVisibleActivities(): Promise<void> {
    const filteredActivities = this.filtered;
    this.totalCount = filteredActivities.length;

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
    const pageItems = filteredActivities.slice(startIndex, startIndex + this.pageSize);

    this.visibleActivities = await Promise.all(
      pageItems.map(async (activity) => ({
        ...activity,
        images: await this.getActivityImages(activity.id),
      })),
    );
    this.favoriteStateService.applyToList(this.visibleActivities, (activity) => ({
      type: 'activity',
      entityId: activity.id,
    }));
    this.cdr.detectChanges();
  }
  private async getActivityImages(activityId: number): Promise<ActivityDto['images']> {
    const cachedImages = this.imageCache.get(activityId);
    if (cachedImages) {
      return cachedImages;
    }

    try {
      const images = (await firstValueFrom(this.imageService.getForActivity(activityId))) ?? [];
      this.imageCache.set(activityId, images);
      return images;
    } catch {
      this.imageCache.set(activityId, []);
      return [];
    }
  }
  onSearchChange(): void {
    this.currentPage = 1;
    void this.refreshVisibleActivities();
  }
  goBack(): void {
    this.router.navigate(['/home']);
  }
}
