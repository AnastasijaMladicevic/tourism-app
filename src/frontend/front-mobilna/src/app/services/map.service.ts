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
  private map: L.Map | null = null;
  private clusterGroups = new Map<string, MarkerClusterGroup>();
  private clusteringEnabled = false;
  private activeFilters: string[] = [];

  private readonly filterMap: Record<string, string[]> = {
    food: ['restaurant', 'kafana', 'bar', 'cafe', 'fast_food', 'winery', 'club'],
    accommodation: ['hotel', 'apartment', 'motel', 'resort', 'hostel'],
    fuel: ['gas_station'],
    shopping: ['shop', 'mall', 'market'],
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
        });
      } else {
        this.map.on('moveend zoomend', () => this.syncVisibleMarkers());
      }

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
      this.map.remove();
      this.map = null;
    }

    this.clusterGroups.clear();
    this.clusteringEnabled = false;
    this.markers = [];
    this.markerMap.clear();
    this.activeMarkerKey = null;
  }

  clearAllMarkers(): void {
    this.clusterGroups.forEach((group) => group.clearLayers());
    this.clusterGroups.forEach((group) => group.remove());
    this.clusterGroups.clear();
    this.markers = [];
    this.markerMap.clear();
    this.activeMarkerKey = null;
  }

  flyTo(lat: number, lng: number, zoom = 16): void {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
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

    marker.on('click', () => {
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

  setActiveFilters(filters: string[]): void {
    this.activeFilters = [...filters];

    if (this.activeMarkerKey) {
      const activeEntry = this.markerMap.get(this.activeMarkerKey);
      if (activeEntry && !this.matchesCurrentFilters(activeEntry.type)) {
        this.activeMarkerKey = null;
      }
    }

    this.syncVisibleMarkers();
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
        this.matchesCurrentFilters(entry.type) &&
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

      const matchesFilter = this.matchesCurrentFilters(entry.type);
      const isSelected = key === this.activeMarkerKey;
      const shouldDim = (hasFilters && !matchesFilter && !isSelected) || (!!this.activeMarkerKey && !isSelected);
      const shouldHighlight = hasFilters && matchesFilter && !isSelected && !this.activeMarkerKey;

      element.classList.toggle('marker-dimmed', shouldDim);
      element.classList.toggle('marker-filter-match', shouldHighlight);
      element.classList.toggle('marker-selected', isSelected);

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

  private matchesCurrentFilters(type: string): boolean {
    if (!this.activeFilters.length) {
      return true;
    }

    return this.activeFilters.some((filter) => this.filterMap[filter]?.includes(type));
  }

  private toMarkerKey(type: string, id: number): string {
    return `${type}:${id}`;
  }

  private syncClusteredMarkers(): void {
    this.markerMap.forEach((entry) => {
      const group = this.clusterGroups.get(entry.clusterKey);
      if (!group) {
        return;
      }

      const shouldShow = this.matchesCurrentFilters(entry.type);
      const hasLayer = group.hasLayer(entry.marker);

      if (shouldShow && !hasLayer) {
        group.addLayer(entry.marker);
      } else if (!shouldShow && hasLayer) {
        group.removeLayer(entry.marker);
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
