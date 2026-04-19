import {
  Component,
  OnInit,
  ViewEncapsulation,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ObjectService, ObjectDto, ObjectView } from '../../services/object';
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

  pageTitle = 'Places';
  hideTypeFilters = false; // ← novo: sakrivamo filtere kad je specifičan tip

  objectTypes: { id: number; name: string }[] = [];
  objects: ObjectView[] = [];

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
      const title = routeData['title'] as string;

      if (type) {
        this.activeFilter = type;
        this.pageTitle = title;
        this.hideTypeFilters = true; // sakrij type filtere
      } else {
        this.pageTitle = 'Places';
        this.hideTypeFilters = false;
      }

      this.loadData();
    });
  }

  loadData(): void {
  this.isLoading = true;
  this.errorMessage = '';

  this.objectService.getAll().subscribe({
    next: (response: any) => {
      const data: ObjectDto[] = Array.isArray(response)
        ? response
        : response?.items ?? response?.data ?? response?.results ?? response?.value ?? [];

      this.objects = data.map((o) => ({
        ...o,
        isFavorite: false,
        favoriteId: undefined,
      }));

      this.objectTypes = this.extractUniqueTypes(data);
      this.isLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error(err);
      this.objects = [];
      this.isLoading = false;
      this.errorMessage = 'Failed to load places.';
      this.cdr.detectChanges();
    },
  });
}

  private extractUniqueTypes(data: ObjectDto[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();
    data.forEach((o) => {
      if (o.objectTypeName)
        map.set(o.objectTypeName, { id: o.objectTypeId, name: o.objectTypeName });
    });
    return Array.from(map.values());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    if (!(e.target as HTMLElement).closest('.sort-anchor')) this.showSortMenu = false;
  }

  get filtered(): ObjectView[] {
    let list = [...this.objects];

    if (this.searchQuery.trim()) {
      list = list.filter((o) => o.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
    }

    if (this.activeFilter !== 'All') {
      const active = this.activeFilter.trim().toLowerCase();
      list = list.filter((o) => o.objectTypeName?.trim().toLowerCase() === active);
    }

    if (this.minRatingFilter > 0) {
      list = list.filter((o) => (o.averageRating ?? 0) >= this.minRatingFilter);
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
        list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        break;
    }
    return list;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }
  setMinRating(r: number): void {
    this.minRatingFilter = r;
  }

  setSort(option: 'rating' | 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
  }

  sortLabel(): string {
    const map = { rating: 'Top Rated', az: 'A → Z', za: 'Z → A', distance: 'Nearest' };
    return map[this.sortOption];
  }

  toggleFavorite(obj: ObjectView, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    obj.isFavorite = !obj.isFavorite;
  }

  getMainImage(obj: ObjectView): string {
  const anyObj = obj as any;
  const mainImageUrl = anyObj.mainImageUrl as string | undefined;

  if (mainImageUrl?.trim()) {
    return mainImageUrl;
  }

  const img = obj.images?.find((i) => i.isMain) ?? obj.images?.[0];
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
      const hours = JSON.parse(obj.workingHours);
      const now = new Date();
      const dayNames = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];
      const todayKey = dayNames[now.getDay()];

      let todayHours = hours[todayKey] || hours['pon'];
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

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  viewDetails(obj: ObjectView): void {
  const type = obj.objectTypeName?.trim().toLowerCase();

  if (type != null) {
    this.router.navigate(['/object', obj.id]);
    return;
  }
  this.router.navigate(['/objects']);
}

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
