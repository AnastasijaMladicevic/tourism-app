import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import 'leaflet.markercluster';
import { catchError, firstValueFrom, forkJoin, of, Subscription } from 'rxjs';
import * as L from 'leaflet';

import { MapService } from '../../services/map.service';
import { DestinationService } from '../../services/destination';
import { ObjectService } from '../../services/object';
import { EventService } from '../../services/event';
import { ActivityService } from '../../services/activity';
import { LocalityService } from '../../services/locality';
import { RegionService } from '../../services/region';
import { ActiveRegionService } from '../../services/active-region';
import { LocationTrackingService, TrackedLocation } from '../../services/location-tracking';
import {
  LocationIntelligenceService,
  QuietZoneAddressSuggestion,
} from '../../services/location-intelligence';
import { RouteBuilderPoint, RouteBuilderStateService } from '../../services/route-builder-state.service';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

import { environment } from '../../../environment/environment';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

interface SearchResult {
  id: number | string;
  name: string;
  typeName: string;
  location: string;
  image?: string;
  icon: string;
  lat?: number;
  lng?: number;
  raw: any;
  category: 'destination' | 'object' | 'event' | 'activity' | 'locality' | 'address';
  markerType: string;
}

interface FilterChip {
  key: string;
  label: string;
  icon: string;
}

interface RoutePoint {
  id: number | string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  markerType?: string;
  markerId?: number;
}

interface RouteLegSummary {
  distanceKm: number;
  durationMin: number;
}

interface AddStopPreviewItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  lat: number;
  lng: number;
}

type AddStopPanelFilter = 'food' | 'fuel' | 'accommodation' | 'shopping' | 'health';

const SEARCH_STOP_WORDS = new Set([
  'gde', 'mogu', 'moze', 'da', 'na', 'sa', 'u', 'uz', 'za', 'od', 'do', 'i', 'ili',
  'nije', 'nisu', 'je', 'su', 'koji', 'koja', 'koje', 'mnogo', 'malo', 'malom',
  'mala', 'male', 'mali', 'skupa', 'skupo', 'skup', 'skupu', 'hrana', 'hranu',
]);

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DragDropModule, TranslatePipe],
  templateUrl: './map.html',
  styleUrls: ['./map.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;
  showDirectionsModal = false;
  routePoints: RoutePoint[] = [];
  routeSearchQuery = '';
  routeSearchResults: SearchResult[] = [];
  isRoutePlannerOpen = false;
  isRouteListCollapsed = false;
  isRoutePlannerExpanded = false;
  isRoutePlannerDragging = false;
  showAddStopPanel = false;
  addStopPanelQuery = '';
  addStopPanelResults: SearchResult[] = [];
  activeAddStopPanelFilter: AddStopPanelFilter | null = null;
  selectedAddStopResultKey = '';
  totalDistance = 0;
  totalDuration = 0;
  routeLegSummaries: RouteLegSummary[] = [];
  activeFilters: string[] = [];
  filterChips: FilterChip[] = [
    { key: 'food', label: 'map.filters.food', icon: '🍽️' },
    { key: 'fuel', label: 'map.filters.fuel', icon: '⛽' },
    { key: 'accommodation', label: 'map.filters.accommodation', icon: '🏨' },
    { key: 'shopping', label: 'map.filters.shopping', icon: '🛍️' },
    { key: 'health', label: 'map.filters.health', icon: '🏥' }
  ];

  selectedItem: any = null;
  selectedType = '';
  userLocation: L.LatLng | null = null;
  routeStart: RoutePoint | null = null;
  routeEnd: RoutePoint | null = null;
  isRoutePickingMode = false;
  routePickingType: 'start' | 'end' | 'add' = 'add';
  isTracking = false;
  isRouteNavigationActive = false;
  isNavigationAutoCenterEnabled = false;
  showLocationConsentPrompt = false;
  private desktopPlannerResizeStartY: number | null = null;
  private desktopPlannerResizeStartHeight = 0;
  private desktopPlannerResizeCleanup: (() => void) | null = null;
  desktopPlannerHeight: number | null = null;
  private readonly desktopPlannerMinHeight = 180;
  private readonly desktopPlannerMaxHeight = 600;
  private userMarker: L.Marker | null = null;

  private routeLine: L.Polyline | null = null;
  private routeCalculationVersion = 0;
  private readonly navigationZoom = 18;
  private readonly stoppedNavigationZoom = 12;
  private readonly navigationRecalculationThresholdMeters = 12;
  private readonly navigationHeadingThresholdMeters = 3;
  private navigationHeading = 0;
  private previousTrackedLocation: TrackedLocation | null = null;
  readonly addStopPreviewItems: AddStopPreviewItem[] = [
    {
      id: 'kotor-old-town',
      name: 'Kotor Old Town',
      subtitle: 'Stari Grad, Kotor 85330',
      badge: 'Highly Rated',
      lat: 42.4247,
      lng: 18.7712,
    },
    {
      id: 'perast-waterfront',
      name: 'Perast Waterfront',
      subtitle: 'Obala Kapetana Marka Martinovića',
      badge: 'Quick Access',
      lat: 42.4868,
      lng: 18.6995,
    },
    {
      id: 'lovcen-park',
      name: 'Lovćen National Park',
      subtitle: 'Ivanova Korita, Cetinje',
      badge: 'Scenic Stop',
      lat: 42.3993,
      lng: 18.8399,
    },
  ];

  private allItems: SearchResult[] = [];
  private readonly subscriptions = new Subscription();
  private shouldCenterOnNextLocation = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private routeSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private addStopPanelSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private temporarySearchMarker: L.Marker | null = null;
  private routePlannerDragStartY: number | null = null;
  private routePlannerDragCleanup: (() => void) | null = null;
  private routePlannerSettledHeight: number | null = null;
  private routePlannerDefaultHeight: number | null = null;
  private routePlannerDragStartHeight = 0;
  private routePlannerDragMinHeight = 0;
  private routePlannerDragMaxHeight = 0;
  private isDestroyed = false;
  private viewportStabilizeTimerIds: number[] = [];
  private readonly handleViewportResize = (): void => {
    this.updateViewportHeight();
    this.mapService.getMap()?.invalidateSize(false);
    this.cdr.detectChanges();
  };
  routePlannerDragCurrentHeight: number | null = null;
  private readonly handleMapMarkerClicked = (event: Event): void => {
    const detail = (event as CustomEvent<{ data: any; type: string }>).detail;
    if (!detail || this.isDestroyed) {
      return;
    }

    this.ngZone.run(() => {
      this.clearTemporarySearchMarker();
      this.selectedItem = detail.data;
      this.selectedType = detail.type;

      if (this.shouldAppendMapClickToRoute()) {
        const point = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
        if (point) {
          this.appendRoutePoint(point);
        }
      }

      this.cdr.detectChanges();
    });
  };
  get plannerHeightStyle(): string | null {
    const activeHeight = this.isRoutePlannerDragging ? this.routePlannerDragCurrentHeight : this.routePlannerSettledHeight;
    return activeHeight == null ? null : `${activeHeight}px`;
  }
  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private eventService: EventService,
    private activityService: ActivityService,
    private localityService: LocalityService,
    private regionService: RegionService,
    private activeRegionService: ActiveRegionService,
    private authService: AuthService,
    private locationTrackingService: LocationTrackingService,
    private locationIntelligenceService: LocationIntelligenceService,
    private routeBuilderStateService: RouteBuilderStateService,
    private sanitizer: DomSanitizer,
    private translationService: TranslationService,
  ) { }

  ngOnInit(): void {
    this.isDestroyed = false;
    window.addEventListener('map-marker-clicked', this.handleMapMarkerClicked);
    this.subscriptions.add(
      this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
        this.ngZone.run(() => {
          this.isTracking = enabled;
          if (!enabled) {
            this.deactivateRouteNavigation();
          }
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

    this.attachViewportListeners();
    this.updateViewportHeight();

    this.mapService.initMap('main-map', lat, lng, zoom, { enableClustering: true });

    const map = this.mapService.getMap();
    if (!map) return;
    if (map) {
      map.on('click', () => {
        this.routeSearchResults = [];
        this.routeSearchQuery = '';
        this.showSuggestions = false;
        this.closeCard();
      });
      map.on('dragstart', () => {
        this.ngZone.run(() => {
          this.pauseRouteNavigationAutoCenter();
          this.cdr.detectChanges();
        });
      });
    }

    queueMicrotask(() => {
      this.ngZone.run(() => {
        this.blurActiveElement();
        this.isTracking = this.locationTrackingService.isTrackingEnabled();
        this.applyTrackedLocation(this.locationTrackingService.getCurrentLocation());
        this.restoreRouteBuilderState();
        this.scheduleViewportStabilization();
        if (!state?.lat || !state?.lng) {
          this.focusActiveRegion();
        }
        void this.maybeOpenLocationConsentPromptOnMapEnter();
        this.loadAllData(state);
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.routeCalculationVersion++;
    window.removeEventListener('map-marker-clicked', this.handleMapMarkerClicked);
    this.detachViewportListeners();
    this.clearViewportStabilizationTimers();
    this.subscriptions.unsubscribe();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    if (this.routeSearchDebounceTimer) {
      clearTimeout(this.routeSearchDebounceTimer);
      this.routeSearchDebounceTimer = null;
    }
    if (this.addStopPanelSearchDebounceTimer) {
      clearTimeout(this.addStopPanelSearchDebounceTimer);
      this.addStopPanelSearchDebounceTimer = null;
    }
    this.stopRoutePlannerDrag();
    this.syncRouteNavigationPageState(false);
    this.syncRoutePlannerPageState(false);
    this.clearTemporarySearchMarker();
    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = null;
    }
    this.stopDesktopPlannerResize();
    this.mapService.destroyMap();
  }

  toggleGpsTracking(): void {
    if (!this.isTracking) {
      this.openLocationConsentPrompt();
      return;
    }

    this.shouldCenterOnNextLocation = true;
    const currentLocation = this.locationTrackingService.getCurrentLocation();
    if (currentLocation) {
      this.mapService.flyTo(currentLocation.latitude, currentLocation.longitude, 16);
      this.shouldCenterOnNextLocation = false;
    }
  }

  openLocationConsentPrompt(): void {
    this.showLocationConsentPrompt = true;
  }

  closeLocationConsentPrompt(): void {
    this.showLocationConsentPrompt = false;
  }

  openLocationConsentSettings(): void {
    this.showLocationConsentPrompt = false;
    void this.router.navigate(['/location-settings'], {
      queryParams: { locationConsent: '1' },
    });
  }

  private async maybeOpenLocationConsentPromptOnMapEnter(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    const currentLocation = this.locationTrackingService.getCurrentLocation();
    if (currentLocation?.source === 'gps') {
      this.closeLocationConsentPrompt();
      return;
    }

    const permissionState = await this.getGeolocationPermissionState();
    if (permissionState === 'granted') {
      if (!this.locationTrackingService.isTrackingEnabled() || !currentLocation) {
        this.locationTrackingService.startTracking();
      }
      this.closeLocationConsentPrompt();
      this.cdr.detectChanges();
    }
  }

  private async getGeolocationPermissionState(): Promise<PermissionState | 'unsupported'> {
    if (
      typeof navigator === 'undefined' ||
      !('permissions' in navigator) ||
      typeof navigator.permissions?.query !== 'function'
    ) {
      return 'unsupported';
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state;
    } catch {
      return 'unsupported';
    }
  }

  private updateUserMarker(latlng: L.LatLng): void {
    const map = this.mapService.getMap();
    if (!map) return;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html:
        '<div class="user-dot">' +
        '<div class="user-dot__pulse"></div>' +
        '<div class="user-dot__halo"></div>' +
        '<div class="user-dot__core"></div>' +
        '</div>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(latlng);
    } else {
      this.userMarker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }
  }

  private clearUserMarker(): void {
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
  }

  private applyTrackedLocation(location: TrackedLocation | null): void {
    if (!location) {
      this.userLocation = null;
      this.previousTrackedLocation = null;
      this.clearUserMarker();
      this.deactivateRouteNavigation();
      return;
    }

    const latlng = L.latLng(location.latitude, location.longitude);
    this.navigationHeading = this.resolveNavigationHeading(location);
    this.userLocation = latlng;
    this.updateUserMarker(latlng);
    this.previousTrackedLocation = location;

    if (this.isRouteNavigationActive) {
      this.syncActiveRouteNavigation(latlng);
      return;
    }

    if (this.shouldCenterOnNextLocation) {
      this.mapService.flyTo(location.latitude, location.longitude, 16);
      this.shouldCenterOnNextLocation = false;
    }
  }

  openDirections(): void {
    this.deactivateRouteNavigation();

    const point = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
    if (!point) return;

    const initialPoints: RoutePoint[] = [];
    const myLocationPoint = this.createMyLocationRoutePoint();

    if (myLocationPoint) {
      initialPoints.push(myLocationPoint);
    }

    initialPoints.push(point);

    this.routePoints = initialPoints;
    this.routeBuilderStateService.openPlanner(this.routePoints);
    this.totalDistance = 0;
    this.totalDuration = 0;
    this.exitMapStopPicking();
    this.openRoutePlannerForEditing({ resetPosition: true });
    this.syncRoutePointMarkers();
    this.closeCard();

    if (this.routePoints.length > 1) {
      void this.calculateRoute();
    }
  }

  getDirections(): void {
    if (!this.userLocation || !this.selectedItem) return;

    const destination = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
    if (!destination) return;

    this.routeEnd = destination;
    this.closeCard();
    void this.calculateRoute();
  }

  showRouteBetweenPins(): void {
    if (!this.routeStart || !this.routeEnd) return;

    void this.calculateRoute();
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
    this.deactivateRouteNavigation();
    this.routePoints = [];
    this.clearDirections();
    this.totalDistance = 0;
    this.totalDuration = 0;
    this.routeSearchResults = [];
    this.routeSearchQuery = '';
    this.showAddStopPanel = false;
    this.routeBuilderStateService.clearPlanner();
    this.syncRoutePointMarkers();
  }

  clearPlannedRouteKeepMyLocation(): void {
    this.deactivateRouteNavigation();
    const existingOrigin = this.routePoints.find((point) => point.id === -1 && point.type === 'gps') ?? null;
    const myLocationPoint = existingOrigin ?? this.createMyLocationRoutePoint();

    this.clearDirections();
    this.routeSearchResults = [];
    this.routeSearchQuery = '';
    this.showAddStopPanel = false;

    if (!myLocationPoint) {
      this.clearPlannedRoute();
      return;
    }

    this.routePoints = [{ ...myLocationPoint }];
    this.totalDistance = 0;
    this.totalDuration = 0;
    this.routeBuilderStateService.updateRoutePoints(this.routePoints);
    this.syncRoutePointMarkers();
    this.exitMapStopPicking();
    this.openRoutePlannerForEditing({ resetPosition: true });
  }

  clearDirections(): void {
    this.routeCalculationVersion++;

    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = null;
    }

    this.totalDistance = 0;
    this.totalDuration = 0;
    this.routeLegSummaries = [];
  }

  async calculateRoute(options: { preserveViewport?: boolean } = {}): Promise<void> {
    if (this.routePoints.length < 2) {
      this.deactivateRouteNavigation();
      this.clearDirections();
      return;
    }

    const requestVersion = ++this.routeCalculationVersion;

    const coords = this.routePoints
      .map(p => `${p.lng},${p.lat}`)
      .join(';');

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${coords}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      const geometry = data?.routes?.[0]?.geometry?.coordinates;
      if (!geometry) return;
      const route = data?.routes?.[0];
      if (!route) return;

      if (this.isDestroyed || requestVersion !== this.routeCalculationVersion || this.routePoints.length < 2) {
        return;
      }

      const routeLegSummaries = Array.isArray(route.legs)
        ? route.legs.map((leg: { distance?: number; duration?: number }) => ({
          distanceKm: (leg.distance ?? 0) / 1000,
          durationMin: (leg.duration ?? 0) / 60,
        }))
        : [];
      const distanceKm = routeLegSummaries.length > 0
        ? routeLegSummaries.reduce(
          (sum: number, leg: RouteLegSummary) => sum + leg.distanceKm,
          0,
        )
        : (route.distance ?? 0) / 1000;
      const durationMin = routeLegSummaries.length > 0
        ? routeLegSummaries.reduce(
          (sum: number, leg: RouteLegSummary) => sum + leg.durationMin,
          0,
        )
        : (route.duration ?? 0) / 60;

      this.routeLegSummaries = routeLegSummaries;
      this.totalDistance = distanceKm;
      this.totalDuration = durationMin;
      this.cdr.markForCheck();
      const latlngs = geometry.map(
        ([lng, lat]: [number, number]) => L.latLng(lat, lng)
      );

      const map = this.mapService.getMap();
      if (!map) return;

      if (this.isDestroyed || requestVersion !== this.routeCalculationVersion || this.routePoints.length < 2) {
        return;
      }

      if (this.routeLine) {
        this.routeLine.remove();
      }

      this.routeLine = L.polyline(latlngs, {
        color: '#168AAD',
        weight: 5,
      }).addTo(map);

      if (!options.preserveViewport && !this.isRouteNavigationActive) {
        map.fitBounds(L.latLngBounds(latlngs), {
          padding: [50, 50],
          maxZoom: 16,
        });
      }

    } catch (e) {
      if (!this.isDestroyed) {
        console.error(e);
      }
    }
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
      if (this.searchQuery.trim() !== query) {
        return;
      }

      void this.applyFallbackSearch(query);
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
    return realText;
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

    if (this.searchResults.length > 0) {
      this.selectSuggestion(this.searchResults[0]);
      return;
    }

    void this.selectTopSearchResult(query);
  }

  private toRoutePoint(result: SearchResult): RoutePoint | null {
    if (!result.lat || !result.lng) return null;

    const markerId = Number(result.id);

    return {
      id: result.id,
      name: result.name,
      type: result.markerType || result.category || 'point',
      lat: result.lat,
      lng: result.lng,
      markerType: result.markerType || result.category || 'point',
      markerId: Number.isNaN(markerId) ? undefined : markerId,
    };
  }

  selectSuggestion(result: SearchResult): void {
    this.searchQuery = '';
    this.showSuggestions = false;
    this.searchResults = [];

    if (result.lat && result.lng) {
      this.mapService.flyTo(result.lat, result.lng, 16);
      if (result.category === 'address') {
        this.focusAddressResult(result);
      } else if (
        result.category === 'destination' ||
        result.category === 'locality' ||
        result.category === 'activity' ||
        result.category === 'object' ||
        result.category === 'event'
      ) {
        this.clearTemporarySearchMarker();
        setTimeout(() => {
          const markerType = result.category === 'object'
            ? this.normalizeMarkerType(result.markerType)
            : result.category;
          this.mapService.triggerMarkerClick(markerType, Number(result.id));
        }, 600);
      }
      if (this.isRoutePlannerOpen) {
        this.addRoutePoint(result);
      }
    }
  }

  private async applyFallbackSearch(query: string): Promise<void> {
    const localResults = this.runLocalSearch(query, 5);
    const addressResults = this.toAddressSearchResults(
      await this.locationIntelligenceService.searchAddresses(query),
      'map',
    );

    if (this.searchQuery.trim() !== query) {
      return;
    }

    this.searchResults = [...localResults, ...addressResults].slice(0, 8);
    this.showSuggestions = this.searchResults.length > 0;
    this.cdr.detectChanges();
  }

  private tokenizeSearchQuery(query: string): string[] {
    return query
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));
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

  private async loadAllData(state?: any): Promise<void> {
    this.allItems = [];
    this.mapService.clearAllMarkers();

    const allObjects = await this.fetchAllObjects();

    forkJoin({
      destinations: this.destinationService.getAll(
        { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true, bypassLanguage: true },
      ).pipe(
        catchError((error) => {
          console.warn('Neuspesno ucitavanje destinacija za mapu.', error);
          return of([]);
        }),
      ),
      events: this.eventService.getAll(
        { page: 1, pageSize: 500, sortBy: 'startDate', sortOrder: 'asc' },
        { bypassRegion: true, bypassLanguage: true },
      ).pipe(
        catchError((error) => {
          console.warn('Neuspesno ucitavanje dogadjaja za mapu.', error);
          return of([]);
        }),
      ),
      activities: this.activityService.getAll(
        { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true, bypassLanguage: true },
      ).pipe(
        catchError((error) => {
          console.warn('Neuspesno ucitavanje aktivnosti za mapu.', error);
          return of([]);
        }),
      ),
      localities: this.localityService.getAll(
        { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true, bypassLanguage: true },
      ).pipe(
        catchError((error) => {
          console.warn('Neuspesno ucitavanje lokaliteta za mapu.', error);
          return of([]);
        }),
      ),
    }).subscribe({
      next: ({ destinations, events, activities, localities }) => {
        const destList = this.toArray<any>(destinations);
        const objList = allObjects;
        const evtList = this.toArray<any>(events);
        const actList = this.toArray<any>(activities);
        const locList = this.toArray<any>(localities);

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

        actList.forEach((activity) => {
          if (activity.latitude && activity.longitude) {
            this.mapService.addMarkerWithType(
              activity.latitude,
              activity.longitude,
              'activity',
              activity,
              undefined,
              false
            );
            this.allItems.push(this.toSearchResult(activity, 'activity', 'activity'));
          }
        });

        locList.forEach((locality) => {
          if (locality.latitude && locality.longitude) {
            this.mapService.addMarkerWithType(
              locality.latitude,
              locality.longitude,
              'locality',
              locality,
              undefined,
              false
            );
            this.allItems.push(this.toSearchResult(locality, 'locality', 'locality'));
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

  private async fetchAllObjects(): Promise<any[]> {
    const all: any[] = [];
    let page = 1;

    while (true) {
      try {
        const response = await firstValueFrom(
          this.objectService.getAll(
            { page, pageSize: 100, sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true, bypassLanguage: true },
          )
        );
        const items = this.toArray<any>(response);
        if (!items.length) break;

        all.push(...items);

        const paged = response as any;
        const totalPages = paged?.totalPages ?? 1;
        if (page >= totalPages) break;
        page++;
      } catch (err) {
        console.error('Greška pri učitavanju objekata, stranica', page, err);
        break;
      }
    }

    return all;
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
      gas_station: 'local_gas_station',
      shop: 'shopping_bag',
      mall: 'shopping_bag',
      market: 'storefront',
      hospital: 'local_hospital',
      clinic: 'local_hospital',
      pharmacy: 'medication',
      attraction: 'place',
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
      image: this.resolveMediaUrl(raw.mainImageUrl ?? raw.images?.[0]?.url ?? ''),
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
    if (
      normalized.includes('hotel') ||
      normalized.includes('albergo') ||
      normalized.includes('resort') ||
      normalized.includes('hostel') ||
      normalized.includes('motel')
    ) {
      return 'hotel';
    }
    if (normalized.includes('apartman') || normalized.includes('apartment') || normalized.includes('villa')) {
      return 'apartment';
    }
    if (
      normalized.includes('pump') ||
      normalized.includes('gas') ||
      normalized.includes('fuel') ||
      normalized.includes('petrol')
    ) {
      return 'gas_station';
    }
    if (
      normalized.includes('apoteka') ||
      normalized.includes('pharmacy')
    ) {
      return 'pharmacy';
    }
    if (
      normalized.includes('bolnica') ||
      normalized.includes('hospital')
    ) {
      return 'hospital';
    }
    if (
      normalized.includes('klinika') ||
      normalized.includes('clinic') ||
      normalized.includes('dom zdravlja')
    ) {
      return 'clinic';
    }
    if (
      normalized.includes('trzni') ||
      normalized.includes('trznica') ||
      normalized.includes('mall') ||
      normalized.includes('shopping')
    ) {
      return 'mall';
    }
    if (
      normalized.includes('prodavnica') ||
      normalized.includes('shop') ||
      normalized.includes('butik') ||
      normalized.includes('market')
    ) {
      return 'shop';
    }
    if (
      normalized.includes('restoran') ||
      normalized.includes('restaurant') ||
      normalized.includes('ristorante') ||
      normalized.includes('konoba') ||
      normalized.includes('bistro') ||
      normalized.includes('pizzeria') ||
      normalized.includes('taverna')
    ) {
      return 'restaurant';
    }
    if (
      normalized.includes('kafana') ||
      normalized.includes('bar') ||
      normalized.includes('cafe') ||
      normalized.includes('kafic') ||
      normalized.includes('pub') ||
      normalized.includes('club') ||
      normalized.includes('klub') ||
      normalized.includes('winery') ||
      normalized.includes('vinarija')
    ) {
      return 'kafana';
    }
    return 'attraction';
  }

  private normalizeMarkerType(type: string): string {
    const normalized = (type ?? '').trim().toLowerCase();
    if (
      normalized === 'bar' ||
      normalized === 'club' ||
      normalized === 'cafe' ||
      normalized === 'winery'
    ) {
      return 'kafana';
    }
    if (
      normalized === 'resort' ||
      normalized === 'hostel' ||
      normalized === 'motel' ||
      normalized === 'apartment'
    ) {
      return normalized === 'apartment' ? 'apartment' : 'hotel';
    }
    return normalized || 'destination';
  }

  getItemImage(): string {
    if (!this.selectedItem) return '';
    return this.resolveMediaUrl(this.selectedItem.mainImageUrl || this.selectedItem.images?.[0]?.url) || '';
  }

  getItemLocation(): string {
    if (!this.selectedItem) return '';
    if (this.selectedType === 'address') {
      return this.selectedItem.address ?? '';
    }
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
        this.activeRegionService.setActiveRegionId(null);
        this.regionService.getDefault().subscribe({
          next: (fallbackRegion) => {
            if (fallbackRegion.centerLatitude == null || fallbackRegion.centerLongitude == null) {
              return;
            }

            this.mapService.flyTo(
              fallbackRegion.centerLatitude,
              fallbackRegion.centerLongitude,
              Math.round(fallbackRegion.defaultMapZoom ?? 8),
            );
          },
        });
      },
    });
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;

    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
  }

  getWorkingStatus(): boolean | null {
    const workingHours = this.selectedItem?.workingHours;
    if (!workingHours) return null;

    try {
      const parsed = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
      const days = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];
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

  openDirectionsModal(): void {
    if (!this.selectedItem) return;

    const point = this.getRoutePointFromItem(this.selectedItem, this.selectedType);
    if (!point) return;

    const initialPoints: RoutePoint[] = [];
    const myLocationPoint = this.createMyLocationRoutePoint();
    if (myLocationPoint) {
      initialPoints.push(myLocationPoint);
    }
    initialPoints.push(point);

    this.routePoints = initialPoints;

    this.showDirectionsModal = true;
  }

  openDetails(): void {
    if (!this.selectedItem) return;

    switch (this.selectedType) {
      case 'destination':
        void this.router.navigate(['/destination', this.selectedItem.id]);
        return;
      case 'locality':
        void this.router.navigate(['/locality', this.selectedItem.id]);
        return;
      case 'activity':
        void this.router.navigate(['/activity', this.selectedItem.id]);
        return;
      case 'event':
        void this.router.navigate(['/event', this.selectedItem.id]);
        return;
      case 'address':
        return;
      default:
        void this.router.navigate(['/object', this.selectedItem.id]);
        return;
    }
  }

  shouldShowDetailsButton(): boolean {
    if (!this.selectedItem) {
      return false;
    }

    if (this.selectedType === 'address') {
      return false;
    }

    return this.selectedItem.isExternalAddress !== true;
  }

  closeCard(): void {
    this.routeSearchResults = [];
    this.showSuggestions = false;
    this.selectedItem = null;
    this.selectedType = '';
    this.clearTemporarySearchMarker();

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
    if (!point) return this.translationService.translate('map.routePlanner.notSelected');
    return `${point.name} (${point.type})`;
  }

  get routeDisplayTitle(): string {
    if (this.routePoints.length === 0) {
      return this.translationService.translate('map.routePlanner.emptyTitle');
    }

    if (this.routePoints.length === 1) {
      return this.routePoints[0].name;
    }

    const extraStops = this.routePoints.length - 1;
    const extraLabel = extraStops === 1
      ? this.translationService.translate('map.routePlanner.oneMoreStop')
      : this.translationService.translate('map.routePlanner.moreStops', { count: extraStops });
    return `${this.routePoints[0].name} + ${extraLabel}`;
  }

  get routeDistanceLabel(): string {
    return this.formatRouteDistance(this.totalDistance);
  }

  get routeDurationLabel(): string {
    return this.formatRouteDuration(this.totalDuration);
  }

  get routeDistanceCompactLabel(): string {
    if (this.totalDistance <= 0) {
      return '0 m';
    }

    if (this.totalDistance < 1) {
      return `${Math.max(1, Math.round(this.totalDistance * 1000))} m`;
    }

    return `${this.totalDistance.toFixed(1)} km`;
  }

  get routePlannerHeightStyle(): string | null {
    if (!this.isCompactViewport()) {
      return null;
    }

    const activeHeight = this.isRoutePlannerDragging ? this.routePlannerDragCurrentHeight : this.routePlannerSettledHeight;
    return activeHeight == null ? null : `${activeHeight}px`;
  }

  get selectedAddStopResult(): SearchResult | null {
    if (!this.selectedAddStopResultKey) {
      return this.addStopPanelResults[0] ?? null;
    }

    return this.addStopPanelResults.find((item) => this.toSearchResultKey(item) === this.selectedAddStopResultKey) ?? null;
  }

  get selectedAddStopPreviewMapUrl(): SafeResourceUrl | null {
    const item = this.selectedAddStopResult;
    if (!item?.lat || !item?.lng) {
      return null;
    }

    return this.buildAddStopPreviewMapUrl(item.lat, item.lng);
  }

  zoomIn(): void {
    this.mapService.getMap()?.zoomIn();
  }

  zoomOut(): void {
    this.mapService.getMap()?.zoomOut();
  }

  private getRoutePointFromItem(item: any, type: string): RoutePoint | null {
    if (!item) return null;

    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const markerId = Number(item.id);
    const markerType = this.normalizeMarkerType(type);

    return {
      id: item.id ?? `${type}:${lat}:${lng}`,
      name: String(item.name ?? 'Point'),
      type: String(item.objectTypeName ?? item.destinationTypeName ?? item.eventTypeName ?? type),
      lat,
      lng,
      markerType,
      markerId: Number.isNaN(markerId) ? undefined : markerId,
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

  closeDirectionsModal(): void {
    this.showDirectionsModal = false;
  }

  onRoutePlannerDragStart(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.stopRoutePlannerDrag();
    const planner = document.querySelector('.route-planner') as HTMLElement | null;
    if (!planner) {
      return;
    }

    const rect = planner.getBoundingClientRect();
    this.routePlannerDefaultHeight ??= rect.height;
    this.routePlannerDragStartY = event.clientY;
    this.routePlannerDragStartHeight = this.routePlannerSettledHeight ?? rect.height;
    this.routePlannerDragMinHeight = 188;
    this.routePlannerDragMaxHeight = this.resolveRoutePlannerMaxHeight(rect);
    this.routePlannerDragCurrentHeight = this.routePlannerDragStartHeight;
    this.isRoutePlannerDragging = true;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (this.routePlannerDragStartY == null) {
        return;
      }

      const rawDelta = moveEvent.clientY - this.routePlannerDragStartY;
      const nextHeight = this.routePlannerDragStartHeight - rawDelta;
      this.routePlannerDragCurrentHeight = Math.max(
        this.routePlannerDragMinHeight,
        Math.min(this.routePlannerDragMaxHeight, nextHeight),
      );
      this.cdr.detectChanges();
    };

    const handlePointerEnd = () => {
      const releasedHeight = this.routePlannerDragCurrentHeight;
      const defaultHeight = this.routePlannerDefaultHeight ?? releasedHeight ?? 0;
      this.routePlannerSettledHeight =
        releasedHeight != null && Math.abs(releasedHeight - defaultHeight) > 8 ? releasedHeight : null;
      this.syncRoutePlannerExpandedState();

      this.stopRoutePlannerDrag();
      this.cdr.detectChanges();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd, { once: true });
    window.addEventListener('pointercancel', handlePointerEnd, { once: true });

    this.routePlannerDragCleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }

  toggleRouteListCollapse(): void {
    this.isRouteListCollapsed = !this.isRouteListCollapsed;
  }

  focusRouteSearch(): void {
    const input = document.querySelector('.route-planner__search-input') as HTMLInputElement | null;
    input?.focus();
  }

  addFirstRouteSearchResultOrFocus(): void {
    if (this.routeSearchResults.length > 0) {
      this.addRoutePoint(this.routeSearchResults[0]);
      return;
    }

    this.focusRouteSearch();
  }

  startPlannedRoute(): void {
    if (this.routePoints.length < 2) {
      return;
    }

    if (this.isRouteNavigationActive && !this.isNavigationAutoCenterEnabled) {
      this.resumeRouteNavigationAutoCenter();
      return;
    }

    const trackingReady = this.isTracking || this.locationTrackingService.startTracking();
    if (!trackingReady) {
      this.openLocationConsentPrompt();
      return;
    }

    this.closeLocationConsentPrompt();
    this.isRouteNavigationActive = true;
    this.isNavigationAutoCenterEnabled = true;
    this.exitMapStopPicking();
    this.shouldCenterOnNextLocation = !this.userLocation;
    this.syncRouteNavigationPageState(true);

    let routeChanged = false;
    if (this.userLocation) {
      routeChanged = this.syncNavigationRouteOrigin(this.userLocation);
      this.focusNavigationOnLocation(this.userLocation);
    }

    if (routeChanged) {
      this.routeBuilderStateService.updateRoutePoints(this.routePoints);
      this.syncRoutePointMarkers();
    }

    void this.calculateRoute({ preserveViewport: true });
  }

  resumeRouteNavigationAutoCenter(): void {
    if (!this.isRouteNavigationActive) {
      return;
    }

    this.isNavigationAutoCenterEnabled = true;

    if (this.userLocation) {
      this.focusNavigationOnLocation(this.userLocation, true);
      return;
    }

    this.shouldCenterOnNextLocation = true;
  }

  stopRouteNavigation(): void {
    const map = this.mapService.getMap();
    const targetCenter = this.userLocation ?? map?.getCenter() ?? null;

    this.deactivateRouteNavigation();

    if (map && targetCenter) {
      map.flyTo(targetCenter, this.stoppedNavigationZoom, { duration: 0.9 });
    } else if (map) {
      map.setZoom(this.stoppedNavigationZoom, { animate: true });
    }
  }

  optimizeRouteSequence(): void {
    void this.calculateRoute({ preserveViewport: this.isRouteNavigationActive });
  }

  enableMapStopPicking(): void {
    this.openRoutePlannerForEditing();
    this.isRoutePickingMode = true;
    this.routeSearchResults = [];

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  handleInlineRouteAction(): void {
    if (window.innerWidth <= 768) {
      void this.router.navigate(['/map/add-stop']);
      return;
    }

    this.enableMapStopPicking();
  }

  getRoutePointMeta(point: RoutePoint, index: number): string {
    if (index === 0) {
      return 'Start • 0 km';
    }

    const legSummary = this.routeLegSummaries[index - 1];
    if (!legSummary) {
      return `Stop ${index + 1}`;
    }

    return `${this.formatRouteDuration(legSummary.durationMin)} • ${this.formatRouteDistance(legSummary.distanceKm)}`;
  }

  addRoutePoint(result: SearchResult): void {
    const routePoint = this.toRoutePoint(result);
    if (!routePoint) return;

    this.appendRoutePoint(routePoint, { disableMapPickingAfterAdd: true });
    this.routeSearchQuery = '';
    this.routeSearchResults = [];
  }

  showRouteSuggestions(): void {
    if (!this.routeSearchQuery.trim()) {
      this.routeSearchResults = [];
      return;
    }
    this.routeSearchResults = this.allItems.slice(0, 5);
  }

  drop(event: CdkDragDrop<RoutePoint[]>): void {
    moveItemInArray(
      this.routePoints,
      event.previousIndex,
      event.currentIndex
    );

    this.routeBuilderStateService.updateRoutePoints(this.routePoints);
    this.syncRoutePointMarkers();
    this.scheduleRoutePlannerListReset();
    void this.calculateRoute({ preserveViewport: this.isRouteNavigationActive });
  }

  closeRoutePlanner(): void {
    this.deactivateRouteNavigation();
    this.isRoutePlannerOpen = false;
    this.isRouteListCollapsed = false;
    this.resetRoutePlannerPosition();
    this.exitMapStopPicking();
    this.showAddStopPanel = false;
    this.syncRoutePlannerPageState(false);
    this.stopRoutePlannerDrag();
    this.clearPlannedRoute();
    this.cdr.markForCheck();
  }

  removeRoutePoint(index: number): void {
    this.routePoints.splice(index, 1);

    if (this.routePoints.length === 0) {
      this.closeRoutePlanner();
      return;
    }

    if (this.routePoints.length < 2) {
      this.deactivateRouteNavigation();
    }

    this.routeBuilderStateService.updateRoutePoints(this.routePoints);
    this.syncRoutePointMarkers();
    this.scheduleRoutePlannerListReset();
    void this.calculateRoute({ preserveViewport: this.isRouteNavigationActive });
  }

  onRouteSearchBlur(): void {
    setTimeout(() => {
      this.routeSearchResults = [];
      this.cdr.detectChanges();
    }, 150);
  }

  onRouteSearch(): void {
    const query = this.routeSearchQuery.trim();

    if (!query) {
      if (this.routeSearchDebounceTimer) {
        clearTimeout(this.routeSearchDebounceTimer);
        this.routeSearchDebounceTimer = null;
      }
      this.routeSearchResults = [];
      return;
    }

    if (this.routeSearchDebounceTimer) {
      clearTimeout(this.routeSearchDebounceTimer);
    }

    this.routeSearchDebounceTimer = setTimeout(() => {
      if (this.routeSearchQuery.trim() !== query) {
        return;
      }

      void this.applyRouteSearch(query);
    }, 220);
  }

  onAddStopPanelSearch(): void {
    const query = this.addStopPanelQuery.trim();

    if (this.addStopPanelSearchDebounceTimer) {
      clearTimeout(this.addStopPanelSearchDebounceTimer);
      this.addStopPanelSearchDebounceTimer = null;
    }

    if (!query) {
      void this.refreshAddStopPanelResults();
      return;
    }

    this.addStopPanelSearchDebounceTimer = setTimeout(() => {
      if (this.addStopPanelQuery.trim() !== query) {
        return;
      }

      void this.refreshAddStopPanelResults();
    }, 220);
  }

  onAddStopPanelSearchBlur(): void {
    if (this.addStopPanelSearchDebounceTimer) {
      clearTimeout(this.addStopPanelSearchDebounceTimer);
      this.addStopPanelSearchDebounceTimer = null;
    }
  }

  onAddStopPanelSearchEnter(): void {
    const firstResult = this.addStopPanelResults[0];
    if (firstResult) {
      this.selectAddStopResult(firstResult);
    }
  }

  private createMyLocationRoutePoint(): RoutePoint | null {
    if (!this.locationTrackingService.isTrackingEnabled() || !this.userLocation) {
      return null;
    }

    return {
      id: -1,
      name: this.translationService.translate('map.routePlanner.myLocation'),
      type: 'gps',
      lat: this.userLocation.lat,
      lng: this.userLocation.lng,
    };
  }

  openAddStopPanel(): void {
    void this.router.navigate(['/map/add-stop']);
  }

  closeAddStopPanel(): void {
    this.showAddStopPanel = false;
    this.addStopPanelQuery = '';
    this.addStopPanelResults = [];
    this.selectedAddStopResultKey = '';
    if (this.addStopPanelSearchDebounceTimer) {
      clearTimeout(this.addStopPanelSearchDebounceTimer);
      this.addStopPanelSearchDebounceTimer = null;
    }
  }

  isAddStopPanelFilterActive(filter: AddStopPanelFilter): boolean {
    return this.activeAddStopPanelFilter === filter;
  }

  setAddStopPanelFilter(filter: AddStopPanelFilter): void {
    this.activeAddStopPanelFilter = this.activeAddStopPanelFilter === filter ? null : filter;
    void this.refreshAddStopPanelResults();
  }

  clearAddStopPanelFilters(): void {
    this.addStopPanelQuery = '';
    this.activeAddStopPanelFilter = null;
    void this.refreshAddStopPanelResults();
  }

  selectAddStopResult(item: SearchResult): void {
    this.selectedAddStopResultKey = this.toSearchResultKey(item);
  }

  isAddStopResultSelected(item: SearchResult): boolean {
    return this.toSearchResultKey(item) === this.selectedAddStopResultKey;
  }

  confirmAddStopResult(): void {
    const item = this.selectedAddStopResult;
    if (!item) {
      return;
    }

    this.addRoutePoint(item);
    this.closeAddStopPanel();
  }

  openManualMapStopPicking(): void {
    this.closeAddStopPanel();
    this.enableMapStopPicking();
  }

  viewSelectedAddStopOnMap(): void {
    const item = this.selectedAddStopResult;
    if (!item?.lat || !item?.lng) {
      return;
    }

    this.closeAddStopPanel();
    this.clearTemporarySearchMarker();
    this.mapService.flyTo(item.lat, item.lng, 16);

    if (item.category === 'address') {
      this.temporarySearchMarker = this.mapService.addMainMapMarker(item.lat, item.lng, item.name);
      return;
    }

    const numericId = Number(item.id);
    if (!Number.isNaN(numericId)) {
      this.mapService.triggerMarkerClick(item.markerType, numericId, 16);
      return;
    }

    this.selectedItem = item.raw;
    this.selectedType = item.markerType;
    this.cdr.detectChanges();
  }

  isRouteLocationLoading(): boolean {
    return this.locationTrackingService.isTrackingEnabled() && !this.userLocation;
  }

  private runLocalSearch(query: string, limit: number): SearchResult[] {
    const terms = this.tokenizeSearchQuery(query);
    return this.allItems
      .map((item) => ({
        item,
        score: this.scoreItem(item, terms),
      }))
      .filter((entry) => this.matchesAllTerms(entry.item, terms))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  private async applyRouteSearch(query: string): Promise<void> {
    const localResults = this.runLocalSearch(query, 4);
    const addressResults = this.toAddressSearchResults(
      await this.locationIntelligenceService.searchAddresses(query),
      'route',
    );

    if (this.routeSearchQuery.trim() !== query) {
      return;
    }

    this.routeSearchResults = [...localResults, ...addressResults].slice(0, 6);
    this.cdr.detectChanges();
  }

  private async refreshAddStopPanelResults(): Promise<void> {
    const query = this.addStopPanelQuery.trim();
    let results: SearchResult[];

    if (query) {
      const localResults = this
        .runLocalSearch(query, 10)
        .filter((item) => this.matchesAddStopPanelFilter(item));
      const addressResults = this.toAddressSearchResults(
        await this.locationIntelligenceService.searchAddresses(query),
        'desktop-add-stop',
      );

      if (this.addStopPanelQuery.trim() !== query) {
        return;
      }

      results = this.mergeSearchResults(localResults, addressResults).slice(0, 8);
    } else {
      results = this.getSuggestedAddStopResults();
    }

    this.addStopPanelResults = results;
    this.selectedAddStopResultKey = results[0] ? this.toSearchResultKey(results[0]) : '';
    this.cdr.detectChanges();
  }

  private getSuggestedAddStopResults(): SearchResult[] {
    const anchor = this.routePoints[this.routePoints.length - 1] ?? this.routePoints[0] ?? null;

    return this.allItems
      .filter((item) => this.matchesAddStopPanelFilter(item))
      .filter((item) => !!item.lat && !!item.lng)
      .slice()
      .sort((left, right) => this.scoreSuggestedAddStop(left, anchor) - this.scoreSuggestedAddStop(right, anchor))
      .slice(0, 8);
  }

  private scoreSuggestedAddStop(item: SearchResult, anchor: RoutePoint | null): number {
    if (!anchor || !item.lat || !item.lng) {
      return 0;
    }

    return L.latLng(anchor.lat, anchor.lng).distanceTo(L.latLng(item.lat, item.lng));
  }

  private mergeSearchResults(localResults: SearchResult[], addressResults: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    [...localResults, ...addressResults].forEach((result) => {
      merged.set(this.toSearchResultKey(result), result);
    });

    return [...merged.values()];
  }

  private matchesAddStopPanelFilter(item: SearchResult): boolean {
    if (!this.activeAddStopPanelFilter) {
      return true;
    }

    switch (this.activeAddStopPanelFilter) {
      case 'food':
        return item.markerType === 'restaurant' || item.markerType === 'kafana';
      case 'fuel':
        return item.markerType === 'gas_station';
      case 'accommodation':
        return item.markerType === 'hotel' || item.markerType === 'apartment';
      case 'shopping':
        return ['shop', 'mall', 'market'].includes(item.markerType);
      case 'health':
        return ['pharmacy', 'hospital', 'clinic'].includes(item.markerType);
      default:
        return true;
    }
  }

  private toSearchResultKey(item: SearchResult): string {
    return `${item.category}:${item.id}`;
  }

  private buildAddStopPreviewMapUrl(lat: number, lng: number): SafeResourceUrl {
    const delta = 0.012;
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}` +
      `&layer=mapnik&marker=${lat}%2C${lng}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private async selectTopSearchResult(query: string): Promise<void> {
    const localResults = this.runLocalSearch(query, 5);
    const addressResults = this.toAddressSearchResults(
      await this.locationIntelligenceService.searchAddresses(query),
      'map-enter',
    );
    const combinedResults = [...localResults, ...addressResults];

    if (this.searchQuery.trim() !== query) {
      return;
    }

    if (combinedResults.length > 0) {
      this.searchResults = combinedResults.slice(0, 8);
      this.selectSuggestion(combinedResults[0]);
      return;
    }

    this.showSuggestions = false;
    void this.router.navigate(['/search'], {
      queryParams: { q: query, source: 'map' },
    });
  }

  private toAddressSearchResults(
    suggestions: QuietZoneAddressSuggestion[],
    source: string,
  ): SearchResult[] {
    return suggestions.map((suggestion, index) => {
      const segments = suggestion.displayName
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean);
      const name = segments[0] || suggestion.displayName;
      const location = segments.slice(1).join(', ') || suggestion.displayName;
      const id = `address:${source}:${index}:${suggestion.latitude}:${suggestion.longitude}`;

      return {
        id,
        name,
        typeName: 'Adresa',
        location,
        icon: 'near_me',
        lat: suggestion.latitude,
        lng: suggestion.longitude,
        raw: {
          id,
          name,
          address: suggestion.displayName,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          isExternalAddress: true,
        },
        category: 'address',
        markerType: 'address',
      };
    });
  }

  private focusAddressResult(result: SearchResult): void {
    if (!result.lat || !result.lng) {
      return;
    }

    this.clearTemporarySearchMarker();
    this.mapService.clearMarkerFocus();
    this.temporarySearchMarker = this.mapService.addMainMapMarker(result.lat, result.lng, result.name);
    this.selectedItem = result.raw;
    this.selectedType = 'address';
    this.cdr.detectChanges();
  }

  private clearTemporarySearchMarker(): void {
    if (!this.temporarySearchMarker) {
      return;
    }

    this.temporarySearchMarker.remove();
    this.temporarySearchMarker = null;
  }

  private stopRoutePlannerDrag(): void {
    if (this.routePlannerDragCleanup) {
      this.routePlannerDragCleanup();
      this.routePlannerDragCleanup = null;
    }

    this.routePlannerDragStartY = null;
    this.routePlannerDragStartHeight = this.routePlannerSettledHeight ?? this.routePlannerDefaultHeight ?? 0;
    this.routePlannerDragCurrentHeight = null;
    this.isRoutePlannerDragging = false;
  }

  private resetRoutePlannerPosition(): void {
    this.routePlannerSettledHeight = null;
    this.routePlannerDefaultHeight = null;
    this.desktopPlannerHeight = null;
    this.isRoutePlannerExpanded = false;
  }

  private isCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 769;
  }

  private resolveRoutePlannerMaxHeight(rect: DOMRect): number {
    if (typeof window === 'undefined') {
      return 520;
    }

    const searchBarBottom =
      (document.querySelector('.search-bar:not(.search-bar--hidden)') as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0;
    const chipsBottom =
      (document.querySelector('.filter-chips:not(.filter-chips--hidden)') as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0;
    const topLimit = Math.max(12, searchBarBottom, chipsBottom) + 12;
    const bottomInset = Math.max(0, window.innerHeight - rect.bottom);
    return Math.max(this.routePlannerDragMinHeight, window.innerHeight - topLimit - bottomInset);
  }

  private syncRoutePlannerExpandedState(): void {
    const defaultHeight = this.routePlannerDefaultHeight ?? 0;
    const settledHeight = this.routePlannerSettledHeight ?? defaultHeight;
    this.isRoutePlannerExpanded = settledHeight > defaultHeight + 48;
  }

  private syncRoutePointMarkers(): void {
    const routeMarkers = this.routePoints
      .filter((point): point is RoutePoint & { markerType: string; markerId: number } =>
        !!point.markerType && typeof point.markerId === 'number' && Number.isFinite(point.markerId),
      )
      .map((point) => ({
        type: this.normalizeMarkerType(point.markerType ?? point.type),
        id: point.markerId,
      }));

    this.mapService.setRouteMarkers(routeMarkers);
  }

  private syncRoutePlannerPageState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('route-planner-open', isOpen);
    document.body.classList.toggle('route-planner-open', isOpen);
  }

  private syncRouteNavigationPageState(isActive: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('route-navigation-active', isActive);
    document.body.classList.toggle('route-navigation-active', isActive);
  }

  private restoreRouteBuilderState(): void {
    const restoredRoutePoints = this.routeBuilderStateService.getRoutePoints();

    if (restoredRoutePoints.length > 0) {
      this.routePoints = restoredRoutePoints.map((point) => ({ ...point }));
      this.exitMapStopPicking();
      this.openRoutePlannerForEditing({ resetPosition: true });

      if (this.routePoints.length > 1) {
        void this.calculateRoute();
      } else {
        this.clearDirections();
      }
      this.syncRoutePointMarkers();
      this.scheduleRoutePlannerListReset();
      this.scheduleViewportStabilization();
    } else {
      this.syncRoutePointMarkers();
    }

    if (this.routeBuilderStateService.consumeMapPickingRequest()) {
      this.enableMapStopPicking();
    }
  }

  private syncActiveRouteNavigation(latlng: L.LatLng): void {
    const routeChanged = this.syncNavigationRouteOrigin(latlng);
    if (this.isNavigationAutoCenterEnabled) {
      this.focusNavigationOnLocation(latlng);
    }

    if (!routeChanged) {
      return;
    }

    this.routeBuilderStateService.updateRoutePoints(this.routePoints);
    this.syncRoutePointMarkers();
    void this.calculateRoute({ preserveViewport: true });
  }

  private syncNavigationRouteOrigin(latlng: L.LatLng): boolean {
    if (this.routePoints.length < 2) {
      return false;
    }

    const liveOrigin = this.createMyLocationRoutePoint();
    if (!liveOrigin) {
      return false;
    }

    const firstPoint = this.routePoints[0];
    if (!this.isGpsRoutePoint(firstPoint)) {
      this.routePoints = [liveOrigin, ...this.routePoints];
      return true;
    }

    const previousOrigin = L.latLng(firstPoint.lat, firstPoint.lng);
    if (previousOrigin.distanceTo(latlng) < this.navigationRecalculationThresholdMeters) {
      return false;
    }

    this.routePoints[0] = {
      ...firstPoint,
      ...liveOrigin,
    };
    return true;
  }

  private scheduleRoutePlannerListReset(): void {
    if (typeof window === 'undefined') {
      return;
    }

    let attempts = 0;
    const resetListScroll = () => {
      const routePlannerList = document.querySelector('.route-planner__list') as HTMLElement | null;
      if (routePlannerList) {
        routePlannerList.scrollTop = 0;
      }

      attempts += 1;
      if (attempts < 6) {
        window.setTimeout(resetListScroll, 60);
      }
    };

    requestAnimationFrame(resetListScroll);
  }

  private focusNavigationOnLocation(latlng: L.LatLng, forceRecentering = false): void {
    const map = this.mapService.getMap();
    if (!map) {
      return;
    }

    this.mapService.setNavigationBearing(this.navigationHeading);
    const targetZoom = Math.max(map.getZoom(), this.navigationZoom);
    if (forceRecentering || this.shouldCenterOnNextLocation || map.getZoom() < this.navigationZoom - 1) {
      map.flyTo(latlng, targetZoom, { duration: 0.9 });
      this.shouldCenterOnNextLocation = false;
      return;
    }

    map.panTo(latlng, { animate: true, duration: 0.8 });
  }

  private openRoutePlannerForEditing(options: { resetPosition?: boolean } = {}): void {
    const shouldResetPosition = options.resetPosition || !this.isRoutePlannerOpen;

    this.blurActiveElement();
    this.isRoutePlannerOpen = true;
    this.isRouteListCollapsed = false;
    this.showAddStopPanel = false;
    this.routePickingType = 'add';
    this.routeSearchQuery = '';
    this.routeSearchResults = [];

    if (shouldResetPosition) {
      this.resetRoutePlannerPosition();
    }

    this.syncRoutePlannerPageState(true);
    this.scheduleViewportStabilization();
  }

  private exitMapStopPicking(): void {
    this.isRoutePickingMode = false;
    this.routePickingType = 'add';
  }

  private appendRoutePoint(
    routePoint: RoutePoint,
    options: { disableMapPickingAfterAdd?: boolean } = {},
  ): void {
    this.openRoutePlannerForEditing();
    this.routePoints = [...this.routePoints, routePoint];
    this.routeBuilderStateService.updateRoutePoints(this.routePoints);
    this.syncRoutePointMarkers();
    this.scheduleRoutePlannerListReset();

    if (options.disableMapPickingAfterAdd) {
      this.exitMapStopPicking();
    }

    void this.calculateRoute({ preserveViewport: this.isRouteNavigationActive });
  }

  private toRoutePointFromBuilderPoint(point: RouteBuilderPoint): RoutePoint {
    const markerId = Number(point.markerId ?? point.id);

    return {
      id: point.id,
      name: point.name,
      type: point.type,
      lat: point.lat,
      lng: point.lng,
      markerType: point.markerType ?? this.normalizeMarkerType(point.type),
      markerId: Number.isNaN(markerId) ? undefined : markerId,
    };
  }

  private attachViewportListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('resize', this.handleViewportResize);
    window.visualViewport?.addEventListener('resize', this.handleViewportResize);
  }

  private detachViewportListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('resize', this.handleViewportResize);
    window.visualViewport?.removeEventListener('resize', this.handleViewportResize);
  }

  private updateViewportHeight(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
    document.documentElement.style.setProperty('--map-viewport-height', `${viewportHeight}px`);
  }

  private scheduleViewportStabilization(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.clearViewportStabilizationTimers();

    [0, 120, 260].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        if (this.isDestroyed) {
          return;
        }

        this.blurActiveElement();
        this.updateViewportHeight();
        this.mapService.getMap()?.invalidateSize(false);
        this.cdr.detectChanges();
      }, delay);

      this.viewportStabilizeTimerIds.push(timerId);
    });
  }

  private clearViewportStabilizationTimers(): void {
    if (this.viewportStabilizeTimerIds.length === 0) {
      return;
    }

    this.viewportStabilizeTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    this.viewportStabilizeTimerIds = [];
  }

  private blurActiveElement(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private shouldAppendMapClickToRoute(): boolean {
    if (this.isRouteNavigationActive) {
      return false;
    }

    if (this.isRoutePickingMode) {
      return true;
    }

    return this.isRoutePlannerOpen && this.routePoints.length > 0;
  }

  private isGpsRoutePoint(point: RoutePoint | null | undefined): point is RoutePoint {
    return !!point && point.id === -1 && point.type === 'gps';
  }

  private deactivateRouteNavigation(): void {
    this.isRouteNavigationActive = false;
    this.isNavigationAutoCenterEnabled = false;
    this.shouldCenterOnNextLocation = false;
    this.syncRouteNavigationPageState(false);
    this.mapService.resetNavigationBearing();
  }

  private pauseRouteNavigationAutoCenter(): void {
    if (!this.isRouteNavigationActive || !this.isNavigationAutoCenterEnabled) {
      return;
    }

    this.isNavigationAutoCenterEnabled = false;
  }

  private resolveNavigationHeading(location: TrackedLocation): number {
    if (typeof location.heading === 'number' && Number.isFinite(location.heading)) {
      return location.heading;
    }

    if (!this.previousTrackedLocation) {
      return this.navigationHeading;
    }

    const previousPoint = L.latLng(this.previousTrackedLocation.latitude, this.previousTrackedLocation.longitude);
    const currentPoint = L.latLng(location.latitude, location.longitude);

    if (previousPoint.distanceTo(currentPoint) < this.navigationHeadingThresholdMeters) {
      return this.navigationHeading;
    }

    return this.calculateBearing(previousPoint, currentPoint);
  }

  private calculateBearing(from: L.LatLng, to: L.LatLng): number {
    const fromLat = this.toRadians(from.lat);
    const toLat = this.toRadians(to.lat);
    const deltaLng = this.toRadians(to.lng - from.lng);
    const y = Math.sin(deltaLng) * Math.cos(toLat);
    const x =
      Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  private formatRouteDistance(distanceKm: number): string {
    if (distanceKm <= 0) {
      return '0 km';
    }

    return `${distanceKm.toFixed(1)} km`;
  }

  private formatRouteDuration(durationMinutes: number): string {
    if (durationMinutes <= 0) {
      return '0 min';
    }

    const roundedMinutes = Math.round(durationMinutes);
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private toDegrees(value: number): number {
    return (value * 180) / Math.PI;
  }
  onDesktopPlannerResizeStart(event: PointerEvent): void {
    if (this.isCompactViewport()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.stopDesktopPlannerResize();

    const planner = document.querySelector('.route-planner') as HTMLElement | null;
    if (!planner) {
      return;
    }

    this.desktopPlannerResizeStartY = event.clientY;
    this.desktopPlannerResizeStartHeight = this.desktopPlannerHeight ?? planner.getBoundingClientRect().height;

    const handleMove = (moveEvent: PointerEvent) => {
      if (this.desktopPlannerResizeStartY == null) {
        return;
      }

      const delta = moveEvent.clientY - this.desktopPlannerResizeStartY;
      const next = this.desktopPlannerResizeStartHeight + delta;
      this.desktopPlannerHeight = Math.max(
        this.desktopPlannerMinHeight,
        Math.min(this.desktopPlannerMaxHeight, next)
      );
      this.syncRoutePlannerExpandedState();
      this.cdr.detectChanges();
    };

    const handleEnd = () => {
      this.syncRoutePlannerExpandedState();
      this.stopDesktopPlannerResize();
      this.cdr.detectChanges();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd, { once: true });
    window.addEventListener('pointercancel', handleEnd, { once: true });

    this.desktopPlannerResizeCleanup = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }

  private stopDesktopPlannerResize(): void {
    if (this.desktopPlannerResizeCleanup) {
      this.desktopPlannerResizeCleanup();
      this.desktopPlannerResizeCleanup = null;
    }
    this.desktopPlannerResizeStartY = null;
  }
}
