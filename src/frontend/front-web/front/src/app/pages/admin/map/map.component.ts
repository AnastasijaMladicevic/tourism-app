import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
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
import { AuthService } from '../../../services/auth.service';
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
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  selectedItem: AdminMapDestination | null = null;
  selectedType: 'destination' | '' = '';
  userLocation: L.LatLng | null = null;
  isTracking = false;

  private watchId: number | null = null;
  private userMarker: L.Marker | null = null;
  private userCircle: L.Circle | null = null;
  private routingControl: any = null;
  private allItems: SearchResult[] = [];

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private destinationService: DestinationService,
    private authService: AuthService,
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
    this.stopTracking();
    this.mapService.destroyMap();
  }

  toggleGpsTracking(): void {
    if (this.isTracking) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  private startTracking(): void {
    if (!navigator.geolocation) {
      alert('Geolocation nije podrzana.');
      return;
    }

    this.isTracking = true;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.ngZone.run(() => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const latlng = L.latLng(lat, lng);
          this.userLocation = latlng;

          this.updateUserMarker(latlng, accuracy);

          if (this.authService.isLoggedIn()) {
            this.authService.updateMyLocation(lat, lng).subscribe();
          }

          this.cdr.detectChanges();
        });
      },
      (err) => {
        this.ngZone.run(() => {
          this.isTracking = false;
          if (err.code === err.PERMISSION_DENIED) {
            alert('Dozvolite pristup lokaciji.');
          }
          this.cdr.detectChanges();
        });
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );

    navigator.geolocation.getCurrentPosition((pos) => {
      this.mapService.flyTo(pos.coords.latitude, pos.coords.longitude, 16);
    });
  }

  private stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;

    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
    if (this.userCircle) {
      this.userCircle.remove();
      this.userCircle = null;
    }
  }

  private updateUserMarker(latlng: L.LatLng, accuracy: number): void {
    const map = this.mapService['map'];
    if (!map) return;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div class="user-dot"><div class="user-dot__pulse"></div></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(latlng);
    } else {
      this.userMarker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }

    if (this.userCircle) {
      this.userCircle.setLatLng(latlng).setRadius(accuracy);
    } else {
      this.userCircle = L.circle(latlng, {
        radius: accuracy,
        color: '#168AAD',
        fillColor: '#168AAD',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
    }
  }

  getDirections(): void {
    if (!this.userLocation || !this.selectedItem?.latitude || !this.selectedItem?.longitude) return;

    this.drawRoute(
      this.userLocation,
      L.latLng(this.selectedItem.latitude, this.selectedItem.longitude),
    );
  }

  clearDirections(): void {
    const map = this.mapService['map'];
    if (this.routingControl && map) {
      map.removeControl(this.routingControl);
      this.routingControl = null;
    }
  }

  private drawRoute(from: L.LatLng, to: L.LatLng): void {
    const map = this.mapService['map'];
    if (!map) return;

    this.clearDirections();

    this.routingControl = (L as any).Routing.control({
      waypoints: [from, to],
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#168AAD', weight: 5, opacity: 0.8 }],
      },
      createMarker: () => null,
    }).addTo(map);
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
    this.clearDirections();

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
