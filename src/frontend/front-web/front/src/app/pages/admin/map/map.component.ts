import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import {
  DestinationDto,
  DestinationService,
} from '../../../services/destination.service';
import { MapService } from '../../../services/map.service';
import { RegionService } from '../../../services/region';
import { ActiveRegionService } from '../../../services/active-region';

interface SearchResult {
  id: number;
  name: string;
  typeName: string;
  location: string;
  image?: string;
  icon: string;
  lat?: number;
  lng?: number;
  raw: AdminMapDestination;
  markerType: 'destination';
}

interface PagedDestinationResponse {
  items: AdminMapDestination[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface AdminMapDestination extends DestinationDto {
  workingHours?: string | Record<string, string>;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  selectedItem: AdminMapDestination | null = null;
  selectedType: 'destination' | '' = '';
  private allItems: SearchResult[] = [];

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private destinationService: DestinationService,
    private regionService: RegionService,
    private activeRegionService: ActiveRegionService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('map-marker-clicked', (event: any) => {
      this.ngZone.run(() => {
        this.selectedItem = event.detail.data;
        this.selectedType = 'destination';
        this.cdr.detectChanges();
      });
    });
  }

  ngAfterViewInit(): void {
    const state = history.state;
    const lat = state?.lat ?? 42.424;
    const lng = state?.lng ?? 18.771;
    const zoom = state?.zoom ?? 13;

    this.mapService.initMap('main-map', lat, lng, zoom);
    if (!state?.lat || !state?.lng) {
      this.focusActiveRegion();
    }
    this.loadAllData(state);

    const map = this.mapService['map'];
    if (map) {
      map.on('click', () => this.closeCard());
    }
  }

  ngOnDestroy(): void {
    this.mapService.destroyMap();
  }

  private matchesAllTerms(item: SearchResult, terms: string[]): boolean {
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();

    return terms.every((term) => name.includes(term) || desc.includes(term));
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.searchResults = [];
      this.showSuggestions = false;
      return;
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = this.allItems
      .map((item) => ({
        item,
        score: this.scoreItem(item, terms),
      }))
      .filter((x) => this.matchesAllTerms(x.item, terms))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    this.searchResults = scored.map((x) => x.item);
    this.showSuggestions = this.searchResults.length > 0;
  }

  private scoreItem(item: SearchResult, terms: string[]): number {
    let score = 0;
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();

    for (const term of terms) {
      if (name.includes(term)) score += 3;
      if (desc.includes(term)) score += 1;
    }

    return score;
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSuggestions = false;
  }

  selectSuggestion(result: SearchResult): void {
    this.searchQuery = result.name;
    this.showSuggestions = false;

    if (result.lat != null && result.lng != null) {
      this.mapService.flyTo(result.lat, result.lng, 16);
      setTimeout(() => {
        this.mapService.triggerMarkerClick(result.markerType, result.id);
      }, 600);
    }
  }

  private loadAllData(state?: any): void {
    this.allItems = [];

    this.getAllDestinations().subscribe({
      next: (destinations) => {
        destinations
          .filter((destination) => destination.latitude != null && destination.longitude != null)
          .forEach((destination) => {
            this.mapService.addMarkerWithType(
              destination.latitude!,
              destination.longitude!,
              'destination',
              destination,
            );
            this.allItems.push(this.toSearchResult(destination));
          });

        if (state?.selectedItem) {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.mapService.triggerMarkerClick(
                'destination',
                state.selectedItem.id,
                state.zoom ?? 16,
              );
              this.cdr.detectChanges();
            });
          }, 100);
        }
      },
      error: (err) => console.error('Greska:', err),
    });
  }

  private getAllDestinations(): Observable<AdminMapDestination[]> {
    const pageSize = 100;

    return this.destinationService
      .getAll({ page: 1, pageSize }, { bypassRegion: true })
      .pipe(
        map((response) => this.toPagedResponse(response)),
        switchMap((firstPage) => {
          if (firstPage.totalPages <= 1) {
            return of(firstPage.items);
          }

          const nextPageRequests = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
            this.destinationService
              .getAll({ page: index + 2, pageSize }, { bypassRegion: true })
              .pipe(map((response) => this.toPagedResponse(response).items)),
          );

          return forkJoin([of(firstPage.items), ...nextPageRequests]).pipe(
            map((pages) => pages.flat()),
          );
        }),
      );
  }

  private toPagedResponse(response: any): PagedDestinationResponse {
    if (Array.isArray(response)) {
      return {
        items: response,
        page: 1,
        pageSize: response.length,
        totalCount: response.length,
        totalPages: 1,
      };
    }

    if (Array.isArray(response?.items)) {
      return {
        items: response.items,
        page: response.page ?? 1,
        pageSize: response.pageSize ?? response.items.length,
        totalCount: response.totalCount ?? response.items.length,
        totalPages: response.totalPages ?? 1,
      };
    }

    return {
      items: [],
      page: 1,
      pageSize: 0,
      totalCount: 0,
      totalPages: 0,
    };
  }

  private toSearchResult(raw: AdminMapDestination): SearchResult {
    return {
      id: raw.id,
      name: raw.name,
      typeName: raw.destinationTypeName ?? 'Destination',
      location: raw.regionName ?? '',
      image: raw.mainImageUrl ?? raw.images?.[0]?.url ?? '',
      icon: 'place',
      lat: raw.latitude,
      lng: raw.longitude,
      raw,
      markerType: 'destination',
    };
  }

  getItemImage(): string {
    if (!this.selectedItem) return '';
    return this.selectedItem.mainImageUrl || this.selectedItem.images?.[0]?.url || '';
  }

  getItemLocation(): string {
    if (!this.selectedItem) return '';
    return this.selectedItem.regionName ?? this.selectedItem.destinationTypeName ?? '';
  }

  private focusActiveRegion(): void {
    const activeRegionId = this.activeRegionService.getActiveRegionId();
    const regionRequest = activeRegionId
      ? this.regionService.getById(activeRegionId)
      : this.regionService.getDefault();

    regionRequest.subscribe({
      next: (region) => {
        if (region.centerLatitude == null || region.centerLongitude == null) {
          return;
        }

        this.mapService.flyTo(
          region.centerLatitude,
          region.centerLongitude,
          Math.round(region.defaultMapZoom ?? 8),
        );
      },
      error: () => {
        // keep the existing default center if region lookup fails
      },
    });
  }

  getWorkingStatus(): boolean | null {
    const workingHours = this.selectedItem?.workingHours;
    if (!workingHours) return null;

    try {
      const parsed = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
      const days = ['ned', 'pon', 'uto', 'sri', 'cet', 'pet', 'sub'];
      const hours = parsed[days[new Date().getDay()]] || parsed['pon'];
      if (!hours || hours === '00:00-24:00') return true;

      const [open, close] = hours.split('-');
      const current = new Date().getHours() * 60 + new Date().getMinutes();
      const toMinutes = (value: string) => {
        const [h, m] = value.split(':').map(Number);
        return h * 60 + m;
      };

      return current >= toMinutes(open) && current <= toMinutes(close);
    } catch {
      return null;
    }
  }

  formatDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
  }

  openDetails(): void {
    if (!this.selectedItem) return;

    this.router.navigate(['/destination', this.selectedItem.id]);
  }

  closeCard(): void {
    this.selectedItem = null;
    this.selectedType = '';

    const activeKey = (window as any).activeMarkerKey;
    if (activeKey) {
      const found = this.mapService['markerMap']?.get(activeKey);
      const map = this.mapService['map'];
      if (found && map && !map.hasLayer(found.marker)) {
        found.marker.addTo(map);
      }
      (window as any).activeMarkerKey = null;
    }

    const regularMarker = (window as any).currentRegularMarker;
    if (regularMarker) {
      regularMarker.remove();
      (window as any).currentRegularMarker = null;
    }

    this.mapService.clearMarkerFocus();

    this.cdr.detectChanges();
  }

  zoomIn(): void {
    (this.mapService as any)['map']?.zoomIn();
  }

  zoomOut(): void {
    (this.mapService as any)['map']?.zoomOut();
  }
}
