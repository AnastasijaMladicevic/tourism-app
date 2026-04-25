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
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import * as L from 'leaflet';

import { MapService } from '../../services/map.service';
import { DestinationService } from '../../services/destination';
import { ObjectService } from '../../services/object';
import { EventService } from '../../services/event';
import { RegionService } from '../../services/region';
import { ActiveRegionService } from '../../services/active-region';
import { LocationTrackingService, TrackedLocation } from '../../services/location-tracking';
import { SmartSearchResultDto, SmartSearchService } from '../../services/smart-search';

interface SearchResult {
  id: number;
  name: string;
  typeName: string;
  location: string;
  image?: string;
  icon: string;
  lat?: number;
  lng?: number;
  raw: any;
  category: 'destination' | 'object' | 'event';
  markerType: string;
}

interface FilterChip {
  key: string;
  label: string;
  icon: string;
}

interface RoutePoint {
  id: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './map.html',
  styleUrls: ['./map.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  activeFilters: string[] = [];
  filterChips: FilterChip[] = [
    { key: 'destination', label: 'Destinations', icon: '📍' },
    { key: 'hotel', label: 'Hotels', icon: '🏨' },
    { key: 'restaurant', label: 'Restaurants', icon: '🍽️' },
    { key: 'kafana', label: 'Bars', icon: '🍷' },
    { key: 'event', label: 'Events', icon: '🎉' },
  ];

  selectedItem: any = null;
  selectedType = '';
  userLocation: L.LatLng | null = null;
  routeStart: RoutePoint | null = null;
  routeEnd: RoutePoint | null = null;

  isTracking = false;
  private userMarker: L.Marker | null = null;
  private userCircle: L.Circle | null = null;

  private routeLine: L.Polyline | null = null;

  private allItems: SearchResult[] = [];
  private readonly subscriptions = new Subscription();
  private shouldCenterOnNextLocation = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private eventService: EventService,
    private regionService: RegionService,
    private activeRegionService: ActiveRegionService,
    private locationTrackingService: LocationTrackingService,
    private smartSearchService: SmartSearchService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('map-marker-clicked', (event: any) => {
      this.ngZone.run(() => {
        this.selectedItem = event.detail.data;
        this.selectedType = event.detail.type;
        this.cdr.detectChanges();
      });
    });

    this.subscriptions.add(
      this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
        this.ngZone.run(() => {
          this.isTracking = enabled;
          this.cdr.detectChanges();
        });
      }),
    );

    this.subscriptions.add(
      this.locationTrackingService.location$.subscribe((location) => {
        this.ngZone.run(() => {
          this.applyTrackedLocation(location);
          this.cdr.detectChanges();
        });
      }),
    );
  }

  ngAfterViewInit(): void {
    const state = history.state;
    const lat = state?.lat ?? 42.424;
    const lng = state?.lng ?? 18.771;
    const zoom = state?.zoom ?? 13;

    this.mapService.initMap('main-map', lat, lng, zoom);
    this.isTracking = this.locationTrackingService.isTrackingEnabled();
    this.applyTrackedLocation(this.locationTrackingService.getCurrentLocation());
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
    this.subscriptions.unsubscribe();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.mapService.destroyMap();
  }

  toggleGpsTracking(): void {
    if (this.isTracking) {
      this.locationTrackingService.stopTracking();
    } else {
      if (!this.locationTrackingService.startTracking()) {
        alert('Geolocation nije podrzana.');
        return;
      }

      this.shouldCenterOnNextLocation = true;
      const currentLocation = this.locationTrackingService.getCurrentLocation();
      if (currentLocation) {
        this.mapService.flyTo(currentLocation.latitude, currentLocation.longitude, 16);
        this.shouldCenterOnNextLocation = false;
      }
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

  private clearUserMarker(): void {
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }

    if (this.userCircle) {
      this.userCircle.remove();
      this.userCircle = null;
    }
  }

  private applyTrackedLocation(location: TrackedLocation | null): void {
    if (!location) {
      this.userLocation = null;
      this.clearUserMarker();
      return;
    }

    const latlng = L.latLng(location.latitude, location.longitude);
    this.userLocation = latlng;
    this.updateUserMarker(latlng, location.accuracy);

    if (this.shouldCenterOnNextLocation) {
      this.mapService.flyTo(location.latitude, location.longitude, 16);
      this.shouldCenterOnNextLocation = false;
    }
  }

  getDirections(): void {
    if (!this.userLocation || !this.selectedItem) return;

    const destination = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
    if (!destination) return;

    this.routeEnd = destination;
    void this.drawRoute(this.userLocation, L.latLng(destination.lat, destination.lng));
  }

  showRouteBetweenPins(): void {
    if (!this.routeStart || !this.routeEnd) return;

    void this.drawRoute(
      L.latLng(this.routeStart.lat, this.routeStart.lng),
      L.latLng(this.routeEnd.lat, this.routeEnd.lng),
    );
  }

  setRoutePoint(mode: 'start' | 'end'): void {
    const point = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
    if (!point) return;

    if (mode === 'start') {
      this.routeStart = point;
      if (this.routeEnd?.id === point.id && this.routeEnd.type === point.type) {
        this.routeEnd = null;
      }
    } else {
      this.routeEnd = point;
      if (this.routeStart?.id === point.id && this.routeStart.type === point.type) {
        this.routeStart = null;
      }
    }

    if (this.routeStart && this.routeEnd) {
      this.showRouteBetweenPins();
    } else {
      this.clearDirections();
    }

    this.cdr.detectChanges();
  }

  clearPlannedRoute(): void {
    this.routeStart = null;
    this.routeEnd = null;
    this.clearDirections();
    this.cdr.detectChanges();
  }

  clearDirections(): void {
    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = null;
    }
  }

  private async drawRoute(from: L.LatLng, to: L.LatLng): Promise<void> {
    const map = this.mapService['map'];
    if (!map) return;

    this.clearDirections();

    const routePoints = await this.fetchRoutePoints(from, to);
    this.routeLine = L.polyline(routePoints, {
      color: '#168AAD',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    map.fitBounds(this.routeLine.getBounds(), {
      padding: [48, 48],
      maxZoom: 16,
    });
  }

  private matchesAllTerms(item: SearchResult, terms: string[]): boolean {
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();
    const amenities = this.getAmenityText(item).toLowerCase();

    return terms.every(
      (term) => name.includes(term) || desc.includes(term) || amenities.includes(term),
    );
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      this.searchResults = [];
      this.showSuggestions = false;
      return;
    }

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      const currentLocation = this.locationTrackingService.getCurrentLocation();
      const includeLocation =
        this.locationTrackingService.isTrackingEnabled() && currentLocation != null;

      this.smartSearchService
        .search({
          query,
          pageSize: 8,
          mode: 'strict',
          latitude: includeLocation ? currentLocation?.latitude : undefined,
          longitude: includeLocation ? currentLocation?.longitude : undefined,
        })
        .pipe(catchError(() => of([] as SmartSearchResultDto[])))
        .subscribe((results) => {
          if (this.searchQuery.trim() !== query) {
            return;
          }

          const mapped = results.map((result) => this.toSmartSearchResult(result));
          if (mapped.length > 0) {
            this.searchResults = mapped;
            this.showSuggestions = true;
          } else {
            this.applyFallbackSearch(query);
          }

          this.cdr.detectChanges();
        });
    }, 260);
  }

  private scoreItem(item: SearchResult, terms: string[]): number {
    let score = 0;
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();
    const amenities = this.getAmenityText(item).toLowerCase();

    for (const term of terms) {
      if (name.includes(term)) score += 3;
      if (desc.includes(term)) score += 1;
      if (amenities.includes(term)) score += 0.5;
    }
    return score;
  }

  private getAmenityText(item: SearchResult): string {
    const rawAmenities = Array.isArray(item.raw?.amenities)
      ? item.raw.amenities.join(' ')
      : '';
    const rawCuisine = item.raw?.cuisineType ?? '';
    const rawType = item.raw?.objectTypeName ?? item.raw?.eventTypeName ?? item.raw?.destinationTypeName ?? '';
    const rawDescription = item.raw?.description ?? '';

    const realText = `${rawAmenities} ${rawCuisine} ${rawType} ${rawDescription}`.trim();
    if (realText) {
      return realText;
    }

    const type = item.markerType.toLowerCase();
    const amenityMap: Record<string, string> = {
      hotel: 'wifi parking gym bazen pool breakfast spa',
      restaurant: 'hrana food dine takeout wifi',
      kafana: 'bar music live terrace',
    };
    return amenityMap[type] ?? '';
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  clearSearch(): void {
    this.searchQuery = '';
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.searchResults = [];
    this.showSuggestions = false;
  }

  submitSearch(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      return;
    }

    this.showSuggestions = false;
    this.router.navigate(['/search'], {
      queryParams: { q: query, source: 'map' },
    });
  }

  selectSuggestion(result: SearchResult): void {
    this.searchQuery = result.name;
    this.showSuggestions = false;

    if (result.lat && result.lng) {
      this.mapService.flyTo(result.lat, result.lng, 16);
      setTimeout(() => {
        this.mapService.triggerMarkerClick(result.markerType, result.id);
      }, 600);
    }
  }

  private applyFallbackSearch(query: string): void {
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

  private toSmartSearchResult(result: SmartSearchResultDto): SearchResult {
    return {
      id: result.id,
      name: result.name,
      typeName: result.typeName,
      location: result.location,
      image: result.imageUrl,
      icon: result.icon || 'place',
      lat: result.latitude,
      lng: result.longitude,
      raw: {
        matchReason: result.matchReason,
        score: result.score,
      },
      category: result.category,
      markerType: result.markerType,
    };
  }

  toggleFilter(key: string): void {
    if (this.activeFilters.includes(key)) {
      this.activeFilters = this.activeFilters.filter((filter) => filter !== key);
    } else {
      this.activeFilters.push(key);
    }
    this.applyFilters();
  }

  private applyFilters(): void {
    this.mapService.setActiveFilters(this.activeFilters);
  }

  private loadAllData(state?: any): void {
    this.allItems = [];

    forkJoin({
      destinations: this.destinationService.getAll(
        { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true },
      ),
      objects: this.objectService.getAll(
        { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true },
      ),
      events: this.eventService.getAll(
        { page: 1, pageSize: 500, sortBy: 'startDate', sortOrder: 'asc' },
        { bypassRegion: true },
      ),
    }).subscribe({
      next: ({ destinations, objects, events }) => {
        const destList = this.toArray<any>(destinations);
        const objList = this.toArray<any>(objects);
        const evtList = this.toArray<any>(events);

        destList.forEach((destination) => {
          if (destination.latitude && destination.longitude) {
            this.mapService.addMarkerWithType(
              destination.latitude,
              destination.longitude,
              'destination',
              destination,
              undefined,
              false,
            );
            this.allItems.push(this.toSearchResult(destination, 'destination', 'destination'));
          }
        });

        objList.forEach((obj) => {
          if (obj.latitude && obj.longitude) {
            const type = this.getObjectType(obj.objectTypeName || '');
            this.mapService.addMarkerWithType(obj.latitude, obj.longitude, type, obj, undefined, false);
            this.allItems.push(this.toSearchResult(obj, type, 'object'));
          }
        });

        evtList.forEach((event) => {
          if (event.latitude && event.longitude) {
            this.mapService.addMarkerWithType(
              event.latitude,
              event.longitude,
              'event',
              event,
              undefined,
              false,
            );
            this.allItems.push(this.toSearchResult(event, 'event', 'event'));
          }
        });

        this.mapService.syncVisibleMarkers();

        if (state?.selectedItem) {
          setTimeout(() => {
            this.ngZone.run(() => {
              const type = state.selectedType || 'object';
              this.mapService.triggerMarkerClick(type, state.selectedItem.id, state.zoom ?? 16);
              this.cdr.detectChanges();
            });
          }, 100);
        }
      },
      error: (err) => console.error('Greska:', err),
    });
  }

  private toSearchResult(
    raw: any,
    markerType: string,
    category: 'destination' | 'object' | 'event',
  ): SearchResult {
    const iconMap: Record<string, string> = {
      destination: 'place',
      hotel: 'hotel',
      restaurant: 'restaurant',
      kafana: 'local_bar',
      event: 'event',
      default: 'place',
    };

    return {
      id: raw.id,
      name: raw.name,
      typeName: raw.objectTypeName ?? raw.destinationTypeName ?? raw.eventTypeName ?? markerType,
      location: raw.localityName ?? raw.destinationName ?? raw.regionName ?? '',
      image: raw.mainImageUrl ?? raw.images?.[0]?.url ?? '',
      icon: iconMap[markerType] ?? iconMap['default'],
      lat: raw.latitude,
      lng: raw.longitude,
      raw,
      category,
      markerType,
    };
  }

  private toArray<T>(response: any): T[] {
    if (Array.isArray(response)) return response;
    if (response?.items) return response.items;
    if (response?.data) return response.data;
    if (response?.results) return response.results;
    if (response?.value) return response.value;
    return [];
  }

  private getObjectType(name: string): string {
    const normalized = name.toLowerCase();
    if (normalized.includes('hotel')) return 'hotel';
    if (normalized.includes('restoran')) return 'restaurant';
    if (normalized.includes('kafana')) return 'kafana';
    return 'restaurant';
  }

  getItemImage(): string {
    if (!this.selectedItem) return '';
    return this.selectedItem.mainImageUrl || this.selectedItem.images?.[0]?.url || '';
  }

  getItemLocation(): string {
    if (!this.selectedItem) return '';
    if (this.selectedType === 'destination') {
      return this.selectedItem.regionName ?? this.selectedItem.destinationTypeName ?? '';
    }
    return [this.selectedItem.localityName, this.selectedItem.destinationName, this.selectedItem.regionName]
      .filter(Boolean)
      .join(', ');
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

    switch (this.selectedType) {
      case 'destination':
        this.router.navigate(['/destination', this.selectedItem.id]);
        break;
      case 'event':
        this.router.navigate(['/event', this.selectedItem.id]);
        break;
      default:
        this.router.navigate(['/object', this.selectedItem.id]);
        break;
    }
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

  get selectedRoutePoint(): RoutePoint | null {
    return this.getRoutePointFromItem(this.selectedItem, this.selectedType);
  }

  canUseSelectedForRoute(): boolean {
    return this.selectedRoutePoint !== null;
  }

  isSelectedAsStart(): boolean {
    const point = this.selectedRoutePoint;
    return !!point && !!this.routeStart && point.id === this.routeStart.id && point.type === this.routeStart.type;
  }

  isSelectedAsEnd(): boolean {
    const point = this.selectedRoutePoint;
    return !!point && !!this.routeEnd && point.id === this.routeEnd.id && point.type === this.routeEnd.type;
  }

  routeSummary(point: RoutePoint | null): string {
    if (!point) return 'Not selected';
    return `${point.name} (${point.type})`;
  }

  zoomIn(): void {
    (this.mapService as any)['map']?.zoomIn();
  }

  zoomOut(): void {
    (this.mapService as any)['map']?.zoomOut();
  }

  private getRoutePointFromItem(item: any, type: string): RoutePoint | null {
    if (!item) return null;

    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return {
      id: Number(item.id),
      name: String(item.name ?? 'Point'),
      type: String(item.objectTypeName ?? item.destinationTypeName ?? item.eventTypeName ?? type),
      lat,
      lng,
    };
  }

  private async fetchRoutePoints(from: L.LatLng, to: L.LatLng): Promise<L.LatLngExpression[]> {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Route request failed with ${response.status}`);
      }

      const payload = await response.json();
      const coordinates = payload?.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error('Route geometry missing');
      }

      return coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
      );
    } catch (error) {
      console.warn('Using straight-line fallback route.', error);
      return [
        [from.lat, from.lng],
        [to.lat, to.lng],
      ];
    }
  }
}
