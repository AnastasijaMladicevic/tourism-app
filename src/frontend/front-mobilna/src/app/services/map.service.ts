import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';

type MarkerFilterKey = 'destination' | 'hotel' | 'restaurant' | 'church' | 'monument';

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
  private clusterGroups = new Map<string, L.MarkerClusterGroup>();
  private clusteringEnabled = false;
  private activeFilters: MarkerFilterKey[] = [];

  private readonly filterMap: Record<MarkerFilterKey, string[]> = {
    destination: ['destination', 'locality', 'activity', 'event', 'attraction'],
    hotel: ['hotel', 'apartment'],
    restaurant: ['restaurant', 'kafana', 'bar', 'cafe', 'fast_food', 'winery', 'club'],
    church: ['church', 'monastery'],
    monument: ['monument', 'museum', 'gallery', 'shop', 'mall', 'market', 'gas_station', 'hospital', 'clinic', 'pharmacy'],
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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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
      this.map.flyTo([lat, lng], zoom, { duration: 1.1 });
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

  addMarkerWithType(
    lat: number,
    lng: number,
    type: string,
    data: any,
    onClick?: () => void,
    autoSync = true,
  ): L.Marker | null {
    if (!this.map) {
      return null;
    }

    const customIcon = L.divIcon({
      className: 'custom-type-marker',
      html: this.getMarkerIconHtml(type),
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
      if (onClick) {
        onClick();
      }
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

  setActiveFilters(filters: MarkerFilterKey[]): void {
    this.activeFilters = [...filters];
    this.syncVisibleMarkers();
  }

  syncVisibleMarkers(): void {
    if (!this.map) {
      return;
    }

    if (this.clusteringEnabled) {
      this.refreshAllClusters();
      this.updateMarkerStyles();
      return;
    }

    const bounds = this.map.getBounds().pad(0.35);

    this.markerMap.forEach((entry, key) => {
      const shouldShow = key === this.activeMarkerKey || bounds.contains([entry.lat, entry.lng]);
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
      if (!element) {
        return;
      }

      const matchesFilter = this.matchesCurrentFilters(entry.type);
      const isSelected = key === this.activeMarkerKey;
      const shouldDim =
        (hasFilters && !matchesFilter && !isSelected) || (!!this.activeMarkerKey && !isSelected);
      const shouldHighlight = hasFilters && matchesFilter && !isSelected && !this.activeMarkerKey;

      element.classList.toggle('marker-dimmed', shouldDim);
      element.classList.toggle('marker-filter-match', shouldHighlight);
      element.classList.toggle('marker-selected', isSelected);

      const pin = element.querySelector('.marker-pin');
      if (pin) {
        if (isSelected) {
          pin.innerHTML =
            '<span class="marker-pin__glyph">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path>' +
            '<path d="M12 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>' +
            '</svg>' +
            '</span>';
          pin.classList.add('marker-pin--selected');
        } else {
          pin.innerHTML = `<span class="marker-pin__glyph">${this.getMarkerSvg(entry.type)}</span>`;
          pin.classList.remove('marker-pin--selected');
        }
      }
    });
  }

  private createClusterGroup(): L.MarkerClusterGroup {
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
          iconSize: [56, 72],
          iconAnchor: [28, 68],
        });
      },
    });
  }

  private getOrCreateClusterGroup(clusterKey: string): L.MarkerClusterGroup {
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

  private matchesCurrentFilters(type: string): boolean {
    if (!this.activeFilters.length) {
      return true;
    }

    return this.activeFilters.some((filter) => this.filterMap[filter]?.includes(type));
  }

  private toMarkerKey(type: string, id: number): string {
    return `${type}:${id}`;
  }

  private getMarkerIconHtml(type: string): string {
    return `<div class="marker-pin"><span class="marker-pin__glyph">${this.getMarkerSvg(type)}</span></div>`;
  }

  private getMarkerSvg(type: string): string {
    const normalized = (type ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'hotel':
      case 'apartment':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18v-8a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3v1h5a2 2 0 0 1 2 2v4M4 14h16M7.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
          </svg>
        `;
      case 'restaurant':
      case 'kafana':
      case 'bar':
      case 'cafe':
      case 'club':
      case 'winery':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3v7M10 3v7M7 7h3M16 3v18M16 10a3 3 0 0 0 3-3V3"></path>
          </svg>
        `;
      case 'church':
      case 'monastery':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v4M10 5h4M6 21V11l6-4 6 4v10M9 21v-4h6v4M8 11h8"></path>
          </svg>
        `;
      case 'monument':
      case 'museum':
      case 'gallery':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 21h14M7 21V9h10v12M9 9V5h6v4M8 13h8M8 17h8"></path>
          </svg>
        `;
      case 'event':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3v3M16 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"></path>
          </svg>
        `;
      case 'activity':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 22l2-6 3 2 1 4M10 9l2 2 3-1 2 2-3 2-2 5"></path>
          </svg>
        `;
      case 'locality':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M8 11h.01M12 11h.01M16 11h.01"></path>
          </svg>
        `;
      default:
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path>
            <path d="M12 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
          </svg>
        `;
    }
  }
}
