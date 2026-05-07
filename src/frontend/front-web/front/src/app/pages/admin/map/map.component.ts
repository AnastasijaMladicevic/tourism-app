import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import * as L from 'leaflet';

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
  @ViewChild('cardElement') private cardElementRef?: ElementRef<HTMLElement>;
  @ViewChild('mapPage') private mapPageRef?: ElementRef<HTMLElement>;

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  selectedItem: AdminMapDestination | null = null;
  isCardVisible = false;
  cardPosition = { left: 16, top: 16 };
  allItems: SearchResult[] = [];

  private readonly markerClickHandler = (event: Event) => {
    const customEvent = event as CustomEvent<{ data: AdminMapDestination }>;

    this.ngZone.run(() => {
      this.selectedItem = customEvent.detail.data;
      this.isCardVisible = false;
      this.cdr.detectChanges();
      this.focusSelectedMarker();
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
      map.on('move zoom resize', () => this.updateCardPosition());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
    this.mapService.destroyMap();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleCardPresentation();
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

  onCardImageLoad(): void {
    this.scheduleCardPresentation();
  }

  closeCard(event?: Event): void {
    event?.stopPropagation();
    this.selectedItem = null;
    this.isCardVisible = false;
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

  private focusSelectedMarker(): void {
    if (!this.selectedItem) {
      return;
    }

    const map = this.mapService.getMap();
    const latitude = this.selectedItem.latitude;
    const longitude = this.selectedItem.longitude;
    if (!map || latitude == null || longitude == null) {
      return;
    }

    const targetLatLng = L.latLng(latitude, longitude);
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 16);
    const currentCenter = map.getCenter();
    const isAlreadyFocused =
      currentZoom >= targetZoom && currentCenter.distanceTo(targetLatLng) < 6;

    if (isAlreadyFocused) {
      this.scheduleCardPresentation();
      return;
    }

    map.once('moveend', () => this.scheduleCardPresentation());
    map.flyTo(targetLatLng, targetZoom, { duration: 0.65 });
  }

  private scheduleCardPresentation(): void {
    if (!this.selectedItem) {
      return;
    }

    setTimeout(() => this.presentCardForSelection(), 0);
  }

  private presentCardForSelection(): void {
    if (!this.selectedItem || !this.mapPageRef) {
      return;
    }

    const map = this.mapService.getMap();
    const cardElement = this.cardElementRef?.nativeElement;
    if (!map || !cardElement) {
      return;
    }

    const latitude = this.selectedItem.latitude;
    const longitude = this.selectedItem.longitude;
    if (latitude == null || longitude == null) {
      return;
    }

    const cardWidth = cardElement.offsetWidth;
    const cardHeight = cardElement.offsetHeight;
    const latLng: [number, number] = [latitude, longitude];

    if (!this.needsMapPanForCard(latLng, cardWidth, cardHeight)) {
      this.isCardVisible = true;
      this.updateCardPosition();
      this.cdr.detectChanges();
      return;
    }

    this.isCardVisible = false;
    this.cdr.detectChanges();

    const markerId = this.selectedItem.id;
    map.once('moveend', () => {
      if (!this.selectedItem || this.selectedItem.id !== markerId) {
        return;
      }

      this.isCardVisible = true;
      this.updateCardPosition();
      this.cdr.detectChanges();
    });

    const horizontalPadding = Math.ceil(cardWidth / 2) + 16;
    const topPadding = 96;
    const bottomPadding = cardHeight + 48;

    map.panInside(latLng, {
      paddingTopLeft: [horizontalPadding, topPadding],
      paddingBottomRight: [horizontalPadding, bottomPadding],
      animate: true,
      duration: 0.35,
    });
  }

  private updateCardPosition(): void {
    if (!this.selectedItem || !this.mapPageRef || !this.isCardVisible) {
      return;
    }

    const map = this.mapService.getMap();
    const cardElement = this.cardElementRef?.nativeElement;
    if (!map || !cardElement) {
      return;
    }

    const latitude = this.selectedItem.latitude;
    const longitude = this.selectedItem.longitude;
    if (latitude == null || longitude == null) {
      return;
    }

    const mapPage = this.mapPageRef.nativeElement;
    const mapWidth = mapPage.clientWidth;
    const mapHeight = mapPage.clientHeight;
    const cardWidth = cardElement.offsetWidth;
    const cardHeight = cardElement.offsetHeight;
    const markerPoint = map.latLngToContainerPoint([latitude, longitude]);

    const horizontalMargin = 16;
    const verticalMargin = 16;
    const cardOffset = 18;

    let left = markerPoint.x - cardWidth / 2;
    left = Math.max(horizontalMargin, Math.min(left, mapWidth - cardWidth - horizontalMargin));

    let top = markerPoint.y + cardOffset;
    top = Math.max(verticalMargin, Math.min(top, mapHeight - cardHeight - verticalMargin));

    this.cardPosition = { left, top };
    this.cdr.detectChanges();
  }

  private needsMapPanForCard(
    latLng: [number, number],
    cardWidth: number,
    cardHeight: number,
  ): boolean {
    const map = this.mapService.getMap();
    const mapPage = this.mapPageRef?.nativeElement;
    if (!map || !mapPage) {
      return false;
    }

    const markerPoint = map.latLngToContainerPoint(latLng);
    const horizontalPadding = Math.ceil(cardWidth / 2) + 16;
    const topPadding = 96;
    const bottomPadding = cardHeight + 48;

    return (
      markerPoint.x < horizontalPadding ||
      markerPoint.x > mapPage.clientWidth - horizontalPadding ||
      markerPoint.y < topPadding ||
      markerPoint.y > mapPage.clientHeight - bottomPadding
    );
  }
}
