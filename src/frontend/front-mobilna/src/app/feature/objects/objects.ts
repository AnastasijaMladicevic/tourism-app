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

import { ObjectDto, ObjectService, ObjectView } from '../../services/object';
import { AuthService } from '../../services/auth';

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

  objectTypes: { id: number; name: string }[] = [];
  objects: ObjectView[] = [];
  visibleObjects: ObjectView[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private objectService: ObjectService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((routeData) => {
      const type = routeData['type'] as string | null;
      const title = routeData['title'] as string | undefined;

      this.pageTitle = title || 'Objects';
      this.hideTypeFilters = Boolean(type);
      this.activeFilter = type ?? 'All';
      this.currentPage = 1;

      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.objectService.getAll().subscribe({
      next: (response: unknown) => {
        const data = this.toArray<ObjectDto>(response);

        this.objects = data.map((obj) => ({
          ...obj,
          isFavorite: false,
          favoriteId: undefined,
        }));
        this.objectTypes = this.extractUniqueTypes(this.objects);
        this.refreshVisibleObjects();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.objects = [];
        this.visibleObjects = [];
        this.totalCount = 0;
        this.hasNextPage = false;
        this.isLoading = false;
        this.errorMessage = 'Failed to load objects.';
        this.cdr.detectChanges();
      },
    });
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

  get filtered(): ObjectView[] {
    let list = [...this.objects];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      list = list.filter((obj) => obj.name.toLowerCase().includes(query));
    }

    if (this.activeFilter !== 'All') {
      const active = this.activeFilter.trim().toLowerCase();
      list = list.filter((obj) => obj.objectTypeName?.trim().toLowerCase() === active);
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
            (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
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

  toggleFavorite(obj: ObjectView, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    obj.isFavorite = !obj.isFavorite;
    this.objects = this.objects.map((item) =>
      item.id === obj.id ? { ...item, isFavorite: obj.isFavorite } : item,
    );
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
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
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

  private extractUniqueTypes(data: ObjectDto[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    data.forEach((obj) => {
      if (obj.objectTypeName) {
        map.set(obj.objectTypeName, { id: obj.objectTypeId, name: obj.objectTypeName });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}
