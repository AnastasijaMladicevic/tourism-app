import { Injectable } from '@angular/core';
import * as LeafletModule from 'leaflet';
import 'leaflet.markercluster';

// Production builds load Leaflet and markercluster through angular.json scripts.
// Prefer the global runtime instance when it is available so both use the same plugin state.
const globalLeaflet = (globalThis as typeof globalThis & { L?: typeof LeafletModule }).L;
const L = (globalLeaflet ?? LeafletModule) as typeof LeafletModule;
type MarkerClusterGroup = LeafletModule.MarkerClusterGroup;

interface MarkerEntry {
  marker: L.Marker;
  data: any;
  type: string;
  lat: number;
  lng: number;
  clusterKey: string;
}

interface MapInitOptions {
  enableClustering?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private static readonly BASE_WORLD_TILE_SIZE = 256;

  private readonly worldBounds = L.latLngBounds(
    L.latLng(-90, -180),
    L.latLng(90, 180),
  );

  private markers: MarkerEntry[] = [];
  private markerMap = new Map<string, MarkerEntry>();
  private activeMarkerKey: string | null = null;
  private routeMarkerKeys = new Set<string>();
  private map: L.Map | null = null;
  private navigationBearing = 0;
  private clusterGroups = new Map<string, MarkerClusterGroup>();
  private clusteringEnabled = false;
  private activeFilters: string[] = [];

  private readonly filterMap: Record<string, string[]> = {
    food: ['restaurant', 'kafana', 'bar', 'cafe', 'club', 'winery'],
    accommodation: ['hotel', 'apartment', 'resort', 'hostel', 'motel', 'villa'],
    fuel: ['gas_station'],
    shopping: ['shop', 'mall', 'market', 'storefront'],
    health: ['hospital', 'clinic', 'pharmacy'],
  };

  getMap(): L.Map | null {
    return this.map;
  }

  addMainMapMarker(lat: number, lng: number, popupText = ''): L.Marker | null {
    if (!this.map) {
      console.error('Mapa nije inicijalizovana');
      return null;
    }

    const icon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      shadowUrl: 'assets/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(this.map);
    if (popupText) {
      marker.bindPopup(`<b>${popupText}</b>`, { closeButton: false });
    }
    return marker;
  }

  initMap(
    containerId: string,
    lat = 42.424,
    lng = 18.771,
    zoom = 13,
    options?: MapInitOptions,
  ): L.Map | null {
    if (this.map) {
      this.destroyMap();
    }

    this.clusteringEnabled = !!options?.enableClustering;

    try {
      this.map = L.map(containerId, {
        zoomControl: false,
        attributionControl: false,
        maxBounds: this.worldBounds,
        maxBoundsViscosity: 1.0,
      }).setView([lat, lng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '',
        noWrap: true,
      }).addTo(this.map);

      this.map.whenReady(() => this.enforceWorldViewportCoverage());
      this.map.on('resize', () => this.enforceWorldViewportCoverage());

      if (this.clusteringEnabled) {
        this.map.on('moveend zoomend', () => {
          this.refreshAllClusters();
          this.updateMarkerStyles();
          this.applyNavigationBearing();
        });
      } else {
        this.map.on('moveend zoomend', () => {
          this.syncVisibleMarkers();
          this.applyNavigationBearing();
        });
      }

      this.map.on('zoom viewreset resize', () => this.applyNavigationBearing());

      return this.map;
    } catch (error) {
      console.error('Greska pri kreiranju mape:', error);
      return null;
    }
  }

  addMarker(lat: number, lng: number, popupText = '', onClick?: () => void): L.Marker | null {
    if (!this.map) {
      console.warn('Mapa nije inicijalizovana - addMarker nije izvrsen');
      return null;
    }

    const customIcon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      shadowUrl: '',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);

    if (popupText) {
      marker.bindPopup(popupText, {
        closeButton: false,
        offset: [0, -10],
      });
    }

    if (onClick) {
      marker.on('click', onClick);
    }

    return marker;
  }

  destroyMap(): void {
    if (this.map) {
      if (this.clusteringEnabled) {
        // Full map: detach container immediately so the browser paints the new
        // route at once, then do all heavy Leaflet cleanup off the main thread.
        // Safe because 'main-map' is never reused by another component.
        const mapToDestroy = this.map;
        const groupsToDestroy = new Map(this.clusterGroups);

        mapToDestroy.getContainer().parentNode?.removeChild(mapToDestroy.getContainer());
        this.map = null;
        this.clusterGroups.clear();

        setTimeout(() => {
          groupsToDestroy.forEach((group) => { group.clearLayers(); group.remove(); });
          mapToDestroy.off();
          mapToDestroy.remove();
        }, 0);
      } else {
        // Mini map: synchronous cleanup (lightweight — 1 marker, no clusters).
        // Cannot defer because ngOnChanges may re-init the same container.
        this.clusterGroups.forEach((group) => { group.clearLayers(); group.remove(); });
        this.clusterGroups.clear();
        this.map.off();
        this.map.remove();
        this.map = null;
      }
    }

    this.clusteringEnabled = false;
    this.markers = [];
    this.markerMap.clear();
    this.activeMarkerKey = null;
    this.activeFilters = [];
    this.routeMarkerKeys.clear();
    this.navigationBearing = 0;
  }

  clearAllMarkers(): void {
    this.clusterGroups.forEach((group) => group.clearLayers());
    this.clusterGroups.forEach((group) => group.remove());
    this.clusterGroups.clear();
    this.markers = [];
    this.markerMap.clear();
    this.activeMarkerKey = null;
    this.routeMarkerKeys.clear();
  }

  flyTo(lat: number, lng: number, zoom = 16): void {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
  }

  setNavigationBearing(bearing: number): void {
    this.navigationBearing = ((bearing % 360) + 360) % 360;
    this.applyNavigationBearing();
  }

  resetNavigationBearing(): void {
    this.navigationBearing = 0;
    this.applyNavigationBearing();
  }

  addMarkerWithType(
    lat: number,
    lng: number,
    type: string,
    data: any,
    onClick?: () => void,
    autoSync = true,
  ): L.Marker | null {
    if (!this.map) return null;

    const iconHtml = this.getMarkerIconHtml(type);
    const customIcon = L.divIcon({
      className: 'custom-type-marker',
      html: iconHtml,
      iconSize: [38, 46],
      iconAnchor: [19, 44],
      popupAnchor: [0, -38],
    });

    const marker = L.marker([lat, lng], { icon: customIcon });
    const clusterKey = this.getClusterKey(data);
    const entry: MarkerEntry = { marker, data, type, lat, lng, clusterKey };
    const key = this.toMarkerKey(type, data?.id);

    this.markers.push(entry);
    this.markerMap.set(key, entry);

    marker.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      this.activateMarker(key);
      if (onClick) onClick();
    });

    if (this.clusteringEnabled) {
      this.getOrCreateClusterGroup(clusterKey).addLayer(marker);
      this.updateMarkerStyles();
    } else if (autoSync) {
      this.syncVisibleMarkers();
    }

    return marker;
  }

  activateMarker(key: string): void {
    const found = this.markerMap.get(key);
    if (!found) {
      console.warn('Marker not found:', key);
      return;
    }

    this.activeMarkerKey = key;
    this.syncVisibleMarkers();

    window.dispatchEvent(
      new CustomEvent('map-marker-clicked', {
        detail: { data: found.data, type: found.type },
      }),
    );
  }

  triggerMarkerClick(type: string, id: number, zoom = 16): void {
    const key = this.toMarkerKey(type, id);
    const found = this.markerMap.get(key);

    if (!found) {
      console.warn('Marker not found:', key);
      return;
    }

    const revealMarker = () => {
      if (this.map && this.map.getZoom() < zoom) {
        this.map.setZoom(zoom, { animate: true });
      }
      this.activateMarker(key);
      this.map?.panTo([found.lat, found.lng], { animate: true });
    };

    if (this.clusteringEnabled) {
      this.clusterGroups.get(found.clusterKey)?.zoomToShowLayer(found.marker, revealMarker);
      return;
    }

    revealMarker();
  }

  clearMarkerFocus(): void {
    this.activeMarkerKey = null;
    this.updateMarkerStyles();
  }

  setRouteMarkers(markers: Array<{ type: string; id: number }>): void {
    this.routeMarkerKeys = new Set(
      markers
        .filter((marker) => Number.isFinite(marker.id) && !!marker.type)
        .map((marker) => this.toMarkerKey(marker.type, marker.id)),
    );
    this.updateMarkerStyles();
  }

  setActiveFilters(filters: string[]): void {
  this.activeFilters = [...filters];
  
  if (this.activeMarkerKey) {
    const activeEntry = this.markerMap.get(this.activeMarkerKey);
    if (activeEntry && !this.matchesCurrentFilters(activeEntry.type, activeEntry.data)) {
      this.activeMarkerKey = null;
    }
  }

  if (this.clusteringEnabled) {
    this.syncClusteredMarkers();
    this.updateMarkerStyles();
  } else {
    this.syncVisibleMarkers();
  }
}

  syncVisibleMarkers(): void {
    if (!this.map) {
      return;
    }

    if (this.clusteringEnabled) {
      this.syncClusteredMarkers();
      this.refreshAllClusters();
      this.updateMarkerStyles();
      return;
    }

    const bounds = this.map.getBounds().pad(0.35);

    this.markerMap.forEach((entry, key) => {
      const shouldShow =
        this.matchesCurrentFilters(entry.type, entry.data) &&
        (key === this.activeMarkerKey || bounds.contains([entry.lat, entry.lng]));
      const hasLayer = this.map?.hasLayer(entry.marker) ?? false;

      if (shouldShow && !hasLayer) {
        entry.marker.addTo(this.map!);
      } else if (!shouldShow && hasLayer) {
        entry.marker.remove();
      }
    });

    this.updateMarkerStyles();
  }

  private updateMarkerStyles(): void {
    const hasFilters = this.activeFilters.length > 0;

    this.markerMap.forEach((entry, key) => {
      const element = entry.marker.getElement();
      if (!element) return;

      const matchesFilter = this.matchesCurrentFilters(entry.type, entry.data);
      const isSelected = key === this.activeMarkerKey;
      const isRouteStop = this.routeMarkerKeys.has(key);
      const shouldDim = (hasFilters && !matchesFilter && !isSelected) || (!!this.activeMarkerKey && !isSelected);
      const shouldHighlight = hasFilters && matchesFilter && !isSelected && !this.activeMarkerKey;

      element.classList.toggle('marker-dimmed', shouldDim);
      element.classList.toggle('marker-filter-match', shouldHighlight);
      element.classList.toggle('marker-selected', isSelected);
      element.classList.toggle('marker-route-stop', isRouteStop);

      const pin = element.querySelector('.marker-pin');
      if (pin) {
        if (isSelected) {
          pin.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3">
        </circle></svg>`;
          pin.classList.add('marker-pin--selected');
        } else {
          pin.innerHTML = `<span class="marker-pin__icon">${this.getMarkerEmoji(entry.type)}</span>`;
          pin.classList.remove('marker-pin--selected');
        }
      }
    });
  }

  private matchesCurrentFilters(type: string, data?: any): boolean {
    if (!this.activeFilters.length) {
      return true;
    }

    const normalizedType = this.normalizeFilterValue(type);

    return this.activeFilters.some((filter) => {
      const normalizedFilter = this.normalizeFilterValue(filter);

      if (normalizedFilter === normalizedType) {
        return true;
      }

      const mappedTypes = this.filterMap[normalizedFilter] ?? [];

      return mappedTypes
        .map((mappedType) => this.normalizeFilterValue(mappedType))
        .includes(normalizedType);
    });
  }

  private normalizeFilterValue(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private toMarkerKey(type: string, id: number): string {
    return `${type}:${id}`;
  }

  private syncClusteredMarkers(): void {
  if (!this.map) return;

  // Ukloni sve grupe sa mape
  this.clusterGroups.forEach((group) => {
    group.clearLayers();
    group.remove();
  });

  // Grupiši markere po clusterKey
  const markersByCluster = new Map<string, L.Marker[]>();

  this.markers.forEach((entry) => {
    if (!this.matchesCurrentFilters(entry.type, entry.data)) return;

    if (!markersByCluster.has(entry.clusterKey)) {
      markersByCluster.set(entry.clusterKey, []);
    }
    markersByCluster.get(entry.clusterKey)!.push(entry.marker);
  });

  // Dodaj nazad na mapu samo one grupe koje imaju vidljive markere
  this.clusterGroups.forEach((group, clusterKey) => {
    const visibleMarkers = markersByCluster.get(clusterKey) ?? [];
    if (visibleMarkers.length > 0) {
      group.addLayers(visibleMarkers);
      group.addTo(this.map!);
    }
  });
}

  private createClusterGroup(): MarkerClusterGroup {
    return L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: false,
      maxClusterRadius: 54,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const sizeClass = count < 10 ? 'small' : count < 30 ? 'medium' : 'large';

        return L.divIcon({
          html:
            '<div class="destination-cluster__pin">' +
            `<span class="destination-cluster__count">${count}</span>` +
            '</div>',
          className: `destination-cluster destination-cluster--${sizeClass}`,
          iconSize: [42, 54],
          iconAnchor: [21, 50],
        });
      },
    });
  }

  private getOrCreateClusterGroup(clusterKey: string): MarkerClusterGroup {
    let group = this.clusterGroups.get(clusterKey);
    if (group) {
      return group;
    }

    group = this.createClusterGroup();
    this.clusterGroups.set(clusterKey, group);
    if (this.map) {
      group.addTo(this.map);
    }

    return group;
  }

  private refreshAllClusters(): void {
    this.clusterGroups.forEach((group) => group.refreshClusters());
  }

  private enforceWorldViewportCoverage(): void {
    if (!this.map) {
      return;
    }

    const container = this.map.getContainer();
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const minZoomForWidth = Math.ceil(Math.log2(width / MapService.BASE_WORLD_TILE_SIZE));
    const minZoomForHeight = Math.ceil(Math.log2(height / MapService.BASE_WORLD_TILE_SIZE));
    const minZoom = Math.max(0, minZoomForWidth, minZoomForHeight);

    this.map.setMinZoom(minZoom);

    if (this.map.getZoom() < minZoom) {
      this.map.setZoom(minZoom, { animate: false });
    }

    this.map.panInsideBounds(this.worldBounds, { animate: false });
  }

  private applyNavigationBearing(): void {
    if (!this.map) {
      return;
    }

    const container = this.map.getContainer();
    const mapPane = this.map.getPane('mapPane');
    if (!container || !mapPane) {
      return;
    }

    const normalizedBearing = ((this.navigationBearing % 360) + 360) % 360;
    const rotation = normalizedBearing === 0 ? '' : ` rotate(${-normalizedBearing}deg)`;
    const baseTransform = this.stripNavigationRotation(mapPane.style.transform);

    mapPane.style.transformOrigin = '50% 50%';
    mapPane.style.transition = rotation ? 'transform 180ms linear' : '';
    mapPane.style.transform = `${baseTransform}${rotation}`;
    container.classList.toggle('map--navigation-bearing', normalizedBearing !== 0);
    container.style.setProperty('--map-bearing', `${-normalizedBearing}deg`);
  }

  private stripNavigationRotation(transformValue: string): string {
    return transformValue.replace(/\srotate\([^)]*\)\s*$/, '');
  }

  private getClusterKey(data: any): string {
    if (data?.countryId != null) {
      return `country:${data.countryId}`;
    }
    if (data?.regionId != null) {
      return `region:${data.regionId}`;
    }
    if (typeof data?.countryCode === 'string' && data.countryCode.trim()) {
      return `country-code:${data.countryCode.trim().toLowerCase()}`;
    }
    if (typeof data?.regionCode === 'string' && data.regionCode.trim()) {
      return `region-code:${data.regionCode.trim().toLowerCase()}`;
    }
    if (typeof data?.countryName === 'string' && data.countryName.trim()) {
      return `country-name:${data.countryName.trim().toLowerCase()}`;
    }
    if (typeof data?.regionName === 'string' && data.regionName.trim()) {
      return `region-name:${data.regionName.trim().toLowerCase()}`;
    }

    return 'region:unknown';
  }

  private getMarkerEmoji(type: string): string {
    const icons: Record<string, string> = {
      destination: '📍', locality: '🏙', event: '🎉', activity: '🚶',
      hotel: '🏨', apartment: '🏠', restaurant: '🍽', kafana: '🍷',
      club: '🎵', winery: '🍇', bar: '🍸', cafe: '☕', gas_station: '⛽',
      shop: '🛍', mall: '🛒', market: '🛒', hospital: '🏥', clinic: '🏥',
      pharmacy: '💊', attraction: '📌', default: '📍',
    };
    return icons[type] ?? icons['default'];
  }

  private getMarkerIconHtml(type: string): string {
    const icons: Record<string, string> = {
      destination: '📍',
      locality: '🏙',
      event: '🎉',
      activity: '🚶',
      hotel: '🏨',
      apartment: '🏠',
      restaurant: '🍽',
      kafana: '🍷',
      club: '🎵',
      winery: '🍇',
      bar: '🍸',
      cafe: '☕',
      gas_station: '⛽',
      shop: '🛍',
      mall: '🛒',
      market: '🛒',
      hospital: '🏥',
      clinic: '🏥',
      pharmacy: '💊',
      attraction: '📌',
      default: '📍',
    };

    const icon = this.getMarkerEmoji(type);
    return `<div class="marker-pin"><span class="marker-pin__icon">${icon}</span></div>`;
  }
}
