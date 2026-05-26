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
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';

import { MatIconModule } from '@angular/material/icon';
import { MapService } from '../../../services/map.service';
import { DestinationDto, DestinationService } from '../../../services/destination.service';
import { ObjectService } from '../../../services/object';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { RegionService } from '../../../services/region';
import { ActiveRegionService } from '../../../services/active-region';
import { ActivitiesService } from '../../../services/activities';
import { environment } from '../../../../environment/environment';

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
  category: 'destination' | 'object' | 'event' | 'activity' | 'locality';
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
  selector: 'app-manager-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css', '../shared/manager-list-page-responsive.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ManagerMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly TARGET_DETAIL_ZOOM = 15;
  private static readonly MANAGER_DESTINATION_FOCUS_ZOOM = 14;

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  activeFilters: string[] = [];
  filterChips: FilterChip[] = [
    { key: 'locality', label: 'Localities', icon: '🏙️' },
    { key: 'object', label: 'Objects', icon: '🏨' },
    { key: 'event', label: 'Events', icon: '🎉' },
    { key: 'activity', label: 'Activities', icon: '🏃' },
  ];

  selectedItem: any = null;
  selectedType = '';
  userLocation: L.LatLng | null = null;
  routeStart: RoutePoint | null = null;
  routeEnd: RoutePoint | null = null;

  isTracking = false;
  private watchId: number | null = null;
  private userMarker: L.Marker | null = null;
  private userCircle: L.Circle | null = null;

  private routingControl: any = null;

  private allItems: SearchResult[] = [];
  private readonly markerClickHandler = (event: Event) => {
    const customEvent = event as CustomEvent<{ data: any; type: string }>;

    this.ngZone.run(() => {
      this.selectedItem = customEvent.detail.data;
      this.selectedType = customEvent.detail.type;
      this.focusSelectedMarker();
      this.cdr.detectChanges();
    });
  };

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private eventService: EventService,
    private activitiesService: ActivitiesService,
    private http: HttpClient,
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
    setTimeout(() => {
      this.mapService.getMap()?.invalidateSize();
    }, 0);
    this.loadAllData(state);

    const map = this.mapService['map'];
    if (map) {
      map.on('click', () => this.closeCard());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
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
    if (!this.userLocation || !this.selectedItem) return;

    const destination = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
    if (!destination) return;

    this.routeEnd = destination;
    this.drawRoute(this.userLocation, L.latLng(destination.lat, destination.lng));
  }

  showRouteBetweenPins(): void {
    if (!this.routeStart || !this.routeEnd) return;

    this.drawRoute(
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
    const amenities = this.getAmenityText(item).toLowerCase();

    return terms.every(
      (term) => name.includes(term) || desc.includes(term) || amenities.includes(term),
    );
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
    const amenities = this.getAmenityText(item).toLowerCase();

    for (const term of terms) {
      if (name.includes(term)) score += 3;
      if (desc.includes(term)) score += 1;
      if (amenities.includes(term)) score += 0.5;
    }
    return score;
  }

  private getAmenityText(item: SearchResult): string {
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
    this.searchResults = [];
    this.showSuggestions = false;
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

  toggleFilter(key: string): void {
    if (this.activeFilters.includes(key)) {
      this.activeFilters = this.activeFilters.filter((filter) => filter !== key);
    } else {
      this.activeFilters.push(key);
    }

    if (
      this.selectedItem &&
      this.activeFilters.length > 0 &&
      !this.matchesActiveFilters(this.selectedType)
    ) {
      this.closeCard();
    }

    this.applyFilters();
  }

  private applyFilters(): void {
    this.mapService.setActiveFilters(this.activeFilters);
  }

  private matchesActiveFilters(type: string): boolean {
    if (!this.activeFilters.length) {
      return true;
    }

    const objectTypes = new Set([
      'hotel',
      'apartment',
      'motel',
      'resort',
      'hostel',
      'restaurant',
      'kafana',
      'bar',
      'cafe',
      'fast_food',
      'winery',
      'club',
      'gas_station',
      'shop',
      'mall',
      'market',
      'hospital',
      'clinic',
      'pharmacy',
      'attraction',
    ]);

    return this.activeFilters.some(
      (filter) => filter === type || (filter === 'object' && objectTypes.has(type)),
    );
  }

  /**
   * Loads only data the signed-in manager is responsible for (server /manager and scoped destination APIs).
   */
  private loadAllData(state?: any): void {
    this.allItems = [];
    const pageSize = 100;

    forkJoin({
      destinations: this.fetchAllPages<DestinationDto>((page) =>
        this.destinationService.getAll({ page, pageSize }, { bypassRegion: true }).pipe(
          map((response: any) => {
            if (Array.isArray(response)) {
              return { items: response, totalPages: 1 };
            }
            return {
              items: response?.items ?? [],
              totalPages: response?.totalPages ?? 0,
            };
          }),
        ),
      ),
      objects: this.fetchAllPages((page) => this.objectService.getForManager({ page, pageSize })),
      events: this.fetchAllPages((page) => this.eventService.getForManager({ page, pageSize })),
      activities: this.fetchAllPages((page) =>
        this.activitiesService.getForManager({ page, pageSize }),
      ),
    })
      .pipe(
        switchMap(({ destinations, objects, events, activities }) =>
          this.loadLocalitiesForManagedDestinations(destinations).pipe(
            map((localities) => ({
              destinations,
              objects,
              events,
              activities,
              localities,
            })),
          ),
        ),
      )
      .subscribe({
        next: ({ destinations, objects, events, activities, localities }) => {
          const managedDestinationIds = new Set(
            destinations.map((destination) => destination.id).filter((id): id is number => id != null),
          );

          const filteredLocalities = localities.filter((locality) =>
            this.belongsToManagedDestination(locality, managedDestinationIds),
          );
          const filteredObjects = objects.filter((obj) =>
            this.belongsToManagedDestination(obj, managedDestinationIds),
          );
          const filteredEvents = events.filter((event) =>
            this.belongsToManagedDestination(event, managedDestinationIds),
          );
          const filteredActivities = activities.filter((activity) =>
            this.belongsToManagedDestination(activity, managedDestinationIds),
          );

          filteredLocalities.forEach((loc) => {
            if (loc.latitude != null && loc.longitude != null) {
              this.mapService.addMarkerWithType(
                loc.latitude,
                loc.longitude,
                'locality',
                loc,
              );
              this.allItems.push(this.toSearchResult(loc, 'locality', 'locality'));
            }
          });

          filteredObjects.forEach((obj) => {
            if (obj.latitude != null && obj.longitude != null) {
              const type = this.getObjectType(obj.objectTypeName || '');
              this.mapService.addMarkerWithType(obj.latitude, obj.longitude, type, obj);
              this.allItems.push(this.toSearchResult(obj, type, 'object'));
            }
          });

          filteredEvents.forEach((event) => {
            if (event.latitude != null && event.longitude != null) {
              this.mapService.addMarkerWithType(event.latitude, event.longitude, 'event', event);
              this.allItems.push(this.toSearchResult(event, 'event', 'event'));
            }
          });

          filteredActivities.forEach((activity) => {
            if (activity.latitude != null && activity.longitude != null) {
              this.mapService.addMarkerWithType(
                activity.latitude,
                activity.longitude,
                'activity',
                activity,
              );
              this.allItems.push(this.toSearchResult(activity, 'activity', 'activity'));
            }
          });

          this.focusManagedContent(
            destinations,
            filteredLocalities,
            filteredObjects,
            filteredEvents,
            filteredActivities,
            state,
          );

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

  private belongsToManagedDestination(
    item: { destinationId?: number | null },
    managedDestinationIds: Set<number>,
  ): boolean {
    if (!managedDestinationIds.size) {
      return false;
    }

    if (item.destinationId == null) {
      return false;
    }

    return managedDestinationIds.has(item.destinationId);
  }

  private fetchAllPages<TItem>(
    load: (page: number) => Observable<{ items?: TItem[]; totalPages?: number }>,
  ): Observable<TItem[]> {
    return load(1).pipe(
      switchMap((first) => {
        const totalPages = first.totalPages ?? 0;
        if (totalPages <= 1) {
          return of(first.items ?? []);
        }
        const rest = Array.from({ length: totalPages - 1 }, (_, i) => load(i + 2));
        return forkJoin(rest).pipe(
          map((pages) => [...(first.items ?? []), ...pages.flatMap((p) => p.items ?? [])]),
        );
      }),
    );
  }

  /** Localities in the API are filtered by destination name; managers are scoped to their destination(s). */
  private loadLocalitiesForManagedDestinations(destinations: DestinationDto[]): Observable<any[]> {
    if (!destinations.length) {
      return of([]);
    }

    return forkJoin(
      destinations.map((d) =>
        this.fetchAllPages((page) => {
          const params = new HttpParams()
            .set('page', String(page))
            .set('pageSize', String(100))
            .set('destination', d.name);
          return this.http.get<{ items?: any[]; totalPages?: number }>(
            `${environment.apiUrl}/localities`,
            { params },
          );
        }),
      ),
    ).pipe(
      map((lists) => {
        const seen = new Set<number>();
        const out: any[] = [];
        for (const list of lists) {
          for (const loc of list) {
            if (loc?.id != null && !seen.has(loc.id)) {
              seen.add(loc.id);
              out.push(loc);
            }
          }
        }
        return out;
      }),
    );
  }

  private toSearchResult(
    raw: any,
    markerType: string,
    category: 'destination' | 'object' | 'event' | 'activity' | 'locality',
  ): SearchResult {
    const iconMap: Record<string, string> = {
      destination: 'place',
      hotel: 'hotel',
      restaurant: 'restaurant',
      kafana: 'local_bar',
      event: 'event',
      activity: 'directions_run',
      locality: 'location_city',
      default: 'place',
    };

    return {
      id: raw.id,
      name: raw.name,
      typeName:
        raw.objectTypeName ??
        raw.destinationTypeName ??
        raw.eventTypeName ??
        raw.activityTypeName ??
        raw.localityTypeName ??
        markerType,
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
    if (this.selectedType === 'locality') {
      return [this.selectedItem.destinationName, this.selectedItem.regionName].filter(Boolean).join(', ');
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

  private focusManagedContent(
    destinations: DestinationDto[],
    localities: any[],
    objects: any[],
    events: any[],
    activities: any[],
    state?: any,
  ): void {
    if (state?.lat != null && state?.lng != null) {
      return;
    }

    const map = this.mapService['map'];
    if (!map) {
      return;
    }

    const points = [
      ...destinations,
      ...localities,
      ...objects,
      ...events,
      ...activities,
    ]
      .map((item) => this.toLatLng(item))
      .filter((point): point is L.LatLngTuple => point !== null);

    if (!points.length) {
      this.focusActiveRegion();
      return;
    }

    if (points.length === 1) {
      const [lat, lng] = points[0];
      this.mapService.flyTo(lat, lng, ManagerMapComponent.MANAGER_DESTINATION_FOCUS_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.2), {
      padding: [72, 72],
      maxZoom: ManagerMapComponent.MANAGER_DESTINATION_FOCUS_ZOOM,
    });
  }

  private toLatLng(item: { latitude?: number | null; longitude?: number | null }): L.LatLngTuple | null {
    if (item.latitude == null || item.longitude == null) {
      return null;
    }

    return [item.latitude, item.longitude];
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
      case 'locality':
        this.router.navigate(['/manager/localities']);
        break;
      case 'event':
        this.router.navigate(['/manager/events/edit', this.selectedItem.id]);
        break;
      case 'activity':
        this.router.navigate(['/manager/activities/review', this.selectedItem.id]);
        break;
      default:
        this.router.navigate(['/manager/objects/review', this.selectedItem.id]);
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

  private focusSelectedMarker(): void {
    if (!this.selectedItem) {
      return;
    }

    const latitude = Number(this.selectedItem.latitude);
    const longitude = Number(this.selectedItem.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const map = this.mapService.getMap();
    if (!map) {
      return;
    }

    const targetLatLng = L.latLng(latitude, longitude);
    const currentZoom = map.getZoom();
    const targetZoom = ManagerMapComponent.TARGET_DETAIL_ZOOM;
    const currentCenter = map.getCenter();
    const distanceToTarget = currentCenter.distanceTo(targetLatLng);
    const isAlreadyFocused = currentZoom >= targetZoom && distanceToTarget < 6;

    if (isAlreadyFocused) {
      return;
    }

    if (currentZoom < targetZoom) {
      map.flyTo(targetLatLng, targetZoom, { duration: 0.75 });
      return;
    }

    map.panTo(targetLatLng, { animate: true, duration: 0.45 });
  }

  private getRoutePointFromItem(item: any, type: string): RoutePoint | null {
    if (!item) return null;

    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return {
      id: Number(item.id),
      name: String(item.name ?? 'Point'),
      type: String(
        item.objectTypeName ??
          item.destinationTypeName ??
          item.eventTypeName ??
          item.activityTypeName ??
          item.localityTypeName ??
          type,
      ),
      lat,
      lng,
    };
  }
}
