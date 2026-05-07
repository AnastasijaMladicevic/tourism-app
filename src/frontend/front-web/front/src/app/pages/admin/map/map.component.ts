import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
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
  @ViewChild('cardsRail') private cardsRailRef?: ElementRef<HTMLElement>;
  @ViewChildren('destinationCard') private destinationCardRefs?: QueryList<ElementRef<HTMLElement>>;

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  selectedItem: AdminMapDestination | null = null;
  allItems: SearchResult[] = [];

  private readonly markerClickHandler = (event: Event) => {
    const customEvent = event as CustomEvent<{ data: AdminMapDestination }>;

    this.ngZone.run(() => {
      this.selectedItem = customEvent.detail.data;
      this.cdr.detectChanges();
      this.scheduleSelectedCardFocus();
    });
  };

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
    window.addEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
  }

  ngAfterViewInit(): void {
    const state = history.state;
    const lat = state?.lat ?? 42.424;
    const lng = state?.lng ?? 18.771;
    const zoom = state?.zoom ?? 13;

    this.mapService.initMap('main-map', lat, lng, zoom, { enableClustering: true });
    if (!state?.lat || !state?.lng) {
      this.focusActiveRegion();
    }
    this.loadAllData(state);

    const map = this.mapService.getMap();
    if (map) {
      map.on('click', () => this.closeCard());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
    this.mapService.destroyMap();
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
    this.mapService.triggerMarkerClick(result.markerType, result.id, 16);
  }

  selectCard(result: SearchResult): void {
    this.mapService.triggerMarkerClick(result.markerType, result.id, 16);
  }

  isSelected(result: SearchResult): boolean {
    return this.selectedItem?.id === result.id;
  }

  getItemImage(item: AdminMapDestination): string {
    return item.mainImageUrl || item.images?.[0]?.url || '';
  }

  getItemLocation(item: AdminMapDestination): string {
    return item.regionName ?? item.destinationTypeName ?? '';
  }

  getWorkingStatus(item: AdminMapDestination): boolean | null {
    const workingHours = item.workingHours;
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

  openDetails(item: AdminMapDestination): void {
    this.selectedItem = item;
    this.router.navigate(['/admin/destinations']);
  }

  closeCard(event?: Event): void {
    event?.stopPropagation();
    this.selectedItem = null;
    this.mapService.clearMarkerFocus();
    this.cdr.detectChanges();
  }

  zoomIn(): void {
    this.mapService.getMap()?.zoomIn();
  }

  zoomOut(): void {
    this.mapService.getMap()?.zoomOut();
  }

  private matchesAllTerms(item: SearchResult, terms: string[]): boolean {
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();

    return terms.every((term) => name.includes(term) || desc.includes(term));
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
        // keep the fallback center if region lookup fails
      },
    });
  }

  private scheduleSelectedCardFocus(): void {
    if (!this.selectedItem) {
      return;
    }

    setTimeout(() => this.focusSelectedCard(), 0);
  }

  private focusSelectedCard(): void {
    if (!this.selectedItem || !this.destinationCardRefs?.length) {
      return;
    }

    const selectedCard = this.destinationCardRefs.find((cardRef) => {
      const id = Number(cardRef.nativeElement.dataset['destinationId']);
      return id === this.selectedItem?.id;
    });

    selectedCard?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });

    this.cardsRailRef?.nativeElement.classList.add('cards-rail--active');
  }
}
