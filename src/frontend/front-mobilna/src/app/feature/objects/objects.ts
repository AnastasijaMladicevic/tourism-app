import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, firstValueFrom, of } from 'rxjs';

import { ObjectDto, ObjectService, ObjectView } from '../../services/object';
import { AuthService } from '../../services/auth';
import { LocationTrackingService } from '../../services/location-tracking';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';

@Component({
  selector: 'app-objects',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './objects.html',
  styleUrls: ['./objects.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObjectsComponent implements OnInit {
  searchQuery = '';
  activeFilter = 'All';
  minRatingFilter = 0;
  sortOption: 'rating' | 'az' | 'za' | 'distance' = 'rating';
  showSortMenu = false;
  isLoading = true;
  errorMessage = '';
  pageTitle = 'Objects';
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private objectService: ObjectService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private locationTrackingService: LocationTrackingService,
    private favoriteStateService: FavoriteStateService,
    private pendingActionService: PendingActionService
  ) { }

  ngOnInit(): void {
    this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
      this.isTracking = enabled;

      if (!enabled) {
        this.clearDistances();
      } else {
        this.updateDistances();
      }

      this.cdr.detectChanges();
    });

    this.locationTrackingService.location$.subscribe((loc) => {
      this.userLocation = loc ? { lat: loc.latitude, lng: loc.longitude } : null;

      if (this.userLocation) {
        this.updateDistances();
      } else {
        this.clearDistances();
      }

      this.refreshVisibleObjects();
      this.cdr.detectChanges();
    });
    this.route.data.subscribe((routeData) => {
      const type = routeData['type'] as string | null;
      const title = routeData['title'] as string | undefined;

      this.pageTitle = title || 'Objects';
      this.hideTypeFilters = Boolean(type);
      this.activeFilter = type ?? 'All';
      this.currentPage = 1;

      this.loadData();
      window.addEventListener('favorite-object', (event: any) => {
        const obj = event.detail;
        if (obj) {
          this.toggleFavorite(obj, new Event('click'));
        }
      });
    });
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.refreshVisibleObjects();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const scopedType = this.hideTypeFilters && this.activeFilter !== 'All' ? this.activeFilter : undefined;

    this.loadAllObjects(scopedType)
      .then((data) => {
        this.objects = data.map((obj) => ({
          ...obj,
          isFavorite: false,
          favoriteId: undefined,
        }));

        return firstValueFrom(
          this.favoriteStateService.loadFavorites(true).pipe(catchError(() => of(new Map<string, number>()))),
        );
      })
      .then(() => {
        this.updateDistances();
        this.refreshVisibleObjects();
        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error(err);
        this.objects = [];
        this.visibleObjects = [];
        this.totalCount = 0;
        this.hasNextPage = false;
        this.isLoading = false;
        this.errorMessage = 'Failed to load objects.';
        this.cdr.detectChanges();
      });
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
        distanceMeters: this.getDistanceKm(
          this.userLocation!.lat,
          this.userLocation!.lng,
          item.latitude,
          item.longitude,
        ),
      };
    });
  }

  private clearDistances(): void {
    this.objects = this.objects.map((item) => ({
      ...item,
      distanceMeters: undefined,
    }));
  }

  getDistanceText(item: ObjectView): string | null {
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

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    this.refreshVisibleObjects();
  }

  setMinRating(rating: number): void {
    this.minRatingFilter = rating;
    this.currentPage = 1;
    this.refreshVisibleObjects();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.refreshVisibleObjects();
  }

  prevPage(): void {
    if (this.currentPage === 1) return;
    this.currentPage--;
    this.refreshVisibleObjects();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;
    this.currentPage++;
    this.refreshVisibleObjects();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('.sort-anchor')) {
      this.showSortMenu = false;
    }
  }
  private tokenize(query: string): string[] {
    return query
      .toLowerCase()
      .split(' ')
      .filter((t) => t.length >= 2);
  }
  get filtered(): ObjectView[] {
    let list = [...this.objects];

    if (this.searchQuery.trim()) {
      const terms = this.tokenize(this.searchQuery);

      list = list.filter((obj) => {
        const text = `
          ${obj.name}
          ${obj.description}
          ${obj.cuisineType}
          ${obj.objectTypeName}
          ${Array.isArray(obj.amenities) ? obj.amenities.join(' ') : ''}
        `.toLowerCase();

        return terms.every(term => text.includes(term));
      });
    }

    if (!this.hideTypeFilters && this.activeFilter !== 'All') {
      const allowedTypes = this.mapFilterToTypes(this.activeFilter);
      if (allowedTypes?.length) {
        list = list.filter((obj) =>
          allowedTypes.includes(this.normalizeTypeToken(obj.objectTypeName)),
        );
      }
    }

    if (this.minRatingFilter > 0) {
      list = list.filter((obj) => (obj.averageRating ?? 0) >= this.minRatingFilter);
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
        list.sort(
          (a, b) =>
            (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
        );
        break;
    }

    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  setSort(option: 'rating' | 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
    this.refreshVisibleObjects();
  }

  sortLabel(): string {
    const map = { rating: 'Top Rated', az: 'A -> Z', za: 'Z -> A', distance: 'Nearest' };
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

  formatDistance(km?: number): string {
    if (km == null) return '';
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
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

  private refreshVisibleObjects(): void {
    const filteredObjects = this.filtered;
    this.totalCount = filteredObjects.length;

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
    this.visibleObjects = filteredObjects.slice(startIndex, startIndex + this.pageSize);
    this.favoriteStateService.applyToList(this.visibleObjects, (object) => ({
      type: 'object',
      entityId: object.id,
    }));
    this.cdr.detectChanges();
  }

  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];

    const obj = raw as Record<string, unknown>;
    const keys = ['items', 'Items', 'data', 'Data', 'results', 'Results', 'value', 'Value'];

    for (const key of keys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }

    return [];
  }

  private mapFilterToTypes(filter: string): string[] | undefined {
    switch (filter) {
      case 'Hrana i pice':
        return ['restoran', 'kafana', 'bar', 'kafic', 'fast food', 'fast_food', 'vinarija', 'club'];
      case 'Pumpe':
        return ['pumpa', 'benzinska pumpa', 'gas_station'];
      case 'Smestaj':
        return ['hotel', 'apartman', 'motel', 'resort', 'hostel', 'pansion'];
      case 'Soping':
        return ['shop', 'shopping centar', 'trzni centar', 'market', 'prodavnica'];
      case 'Bolnice':
        return ['bolnica', 'klinika', 'Poliklinika', 'Dom zdravlja', 'hospital', 'clinic'];
      default:
        return undefined;
    }
  }

  private normalizeTypeToken(value?: string | null): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/š/g, 's')
      .replace(/đ/g, 'dj')
      .replace(/ž/g, 'z')
      .replace(/č/g, 'c')
      .replace(/ć/g, 'c');
  }

  private async loadAllObjects(scopedType?: string): Promise<ObjectDto[]> {
    const allItems: ObjectDto[] = [];
    const seenIds = new Set<number>();
    const pageSize = 100;
    let page = 1;

    while (true) {
      const response = (await firstValueFrom(
        this.objectService.getAll({
          type: scopedType,
          page,
          pageSize,
        }),
      )) as unknown;

      const items = this.toArray<ObjectDto>(response);
      if (!items.length) {
        break;
      }

      let newItemsCount = 0;

      for (const item of items) {
        if (!item?.id || seenIds.has(item.id)) {
          continue;
        }

        seenIds.add(item.id);
        allItems.push(item);
        newItemsCount += 1;
      }

      if (newItemsCount === 0) {
        break;
      }

      if (items.length < pageSize) {
        break;
      }

      page += 1;
    }

    return allItems;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}
