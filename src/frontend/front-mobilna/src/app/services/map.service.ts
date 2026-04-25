import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class MapService {
  private markers: Array<{ marker: L.Marker; data: any; type: string; lat: number; lng: number }> = [];
  private markerMap = new Map<string, { marker: L.Marker; data: any; type: string; lat: number; lng: number }>();
  private activeMarkerKey: string | null = null;
  private activeRegularMarker: L.Marker | null = null;
  private map: L.Map | null = null;
  private activeFilters: string[] = [];

  addMainMapMarker(lat: number, lng: number, popupText: string = ''): L.Marker | null {
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

  initMap(containerId: string, lat: number = 42.424, lng: number = 18.771, zoom: number = 13): L.Map | null {
    if (this.map) {
      this.destroyMap();
    }

    try {
      this.map = L.map(containerId, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lng], zoom);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '',
      }).addTo(this.map);

      this.map.on('moveend zoomend', () => this.syncVisibleMarkers());

      return this.map;
    } catch (error) {
      console.error('Greska pri kreiranju mape:', error);
      return null;
    }
  }

  addMarker(lat: number, lng: number, popupText: string = '', onClick?: () => void): L.Marker | null {
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

    this.markers = [];
    this.markerMap.clear();
    this.activeMarkerKey = null;
    this.activeRegularMarker = null;
  }

  flyTo(lat: number, lng: number, zoom: number = 16): void {
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
    autoSync: boolean = true,
  ): L.Marker | null {
    if (!this.map) return null;

    const iconHtml = this.getMarkerIconHtml(type);
    const customIcon = L.divIcon({
      className: 'custom-type-marker',
      html: iconHtml,
      iconSize: [46, 46],
      iconAnchor: [23, 46],
      popupAnchor: [0, -40],
    });

    const marker = L.marker([lat, lng], { icon: customIcon });
    this.markers.push({ marker, data, type, lat, lng });

    const key = `${type}:${data.id}`;
    this.markerMap.set(key, { marker, data, type, lat, lng });

    marker.on('click', () => {
      this.activateMarker(key);
      if (onClick) onClick();
    });

    if (autoSync) {
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

    const { marker, data, type, lat, lng } = found;

    const prevKey = (window as any).activeMarkerKey;
    if (prevKey && prevKey !== key) {
      const prev = this.markerMap.get(prevKey);
      if (prev && this.map && !this.map.hasLayer(prev.marker)) {
        prev.marker.addTo(this.map);
      }
    }

    const prevRegular = (window as any).currentRegularMarker as L.Marker | null;
    if (prevRegular) {
      prevRegular.remove();
    }

    marker.remove();
    const regularMarker = this.addMarker(lat, lng, data.name);
    this.decorateSelectedRegularMarker(regularMarker);

    (window as any).activeMarkerKey = key;
    (window as any).currentRegularMarker = regularMarker;
    this.activeMarkerKey = key;
    this.activeRegularMarker = regularMarker;
    this.updateMarkerFocus(key);

    window.dispatchEvent(
      new CustomEvent('map-marker-clicked', {
        detail: { data, type },
      }),
    );
  }

  triggerMarkerClick(type: string, id: number, zoom: number = 16): void {
    const key = `${type}:${id}`;
    const found = this.markerMap.get(key);

    if (!found) {
      console.warn('Marker not found:', key);
      return;
    }

    this.activateMarker(key);
    this.map?.flyTo([found.lat, found.lng], zoom);
  }

  clearMarkerFocus(): void {
    this.activeMarkerKey = null;
    this.activeRegularMarker = null;
    this.updateMarkerFocus(null);
    this.syncVisibleMarkers();
  }

  setActiveFilters(filters: string[]): void {
    this.activeFilters = [...filters];
    this.syncVisibleMarkers();
  }

  syncVisibleMarkers(): void {
    if (!this.map) {
      return;
    }

    const bounds = this.map.getBounds().pad(0.35);
    const visibleEntries = new Map<string, { marker: L.Marker; data: any; type: string; lat: number; lng: number }>();

    this.markerMap.forEach((entry, key) => {
      const shouldConsider =
        this.matchesCurrentFilters(entry.type) &&
        (key === this.activeMarkerKey || bounds.contains([entry.lat, entry.lng]));

      if (shouldConsider) {
        visibleEntries.set(key, entry);
      }
    });

    const representativeKeys = this.selectRepresentativeMarkerKeys(visibleEntries);

    this.markerMap.forEach((entry, key) => {
      const marker = entry.marker;
      const shouldShow = representativeKeys.has(key);

      if (shouldShow) {
        if (!this.map!.hasLayer(marker)) {
          marker.addTo(this.map!);
        }
      } else if (this.map!.hasLayer(marker)) {
        marker.remove();
      }
    });
  }

  private updateMarkerFocus(activeKey: string | null): void {
    this.markerMap.forEach((entry, key) => {
      const element = entry.marker.getElement();
      if (!element) return;

      element.classList.toggle('marker-dimmed', !!activeKey && key !== activeKey);
      element.classList.toggle('marker-focused', !!activeKey && key === activeKey);
    });

    const regularElement = this.activeRegularMarker?.getElement();
    if (regularElement) {
      regularElement.classList.toggle('marker-selected-pin', !!activeKey);
    }
  }

  private decorateSelectedRegularMarker(marker: L.Marker | null): void {
    if (!marker) return;

    const applyClass = () => marker.getElement()?.classList.add('marker-selected-pin');
    applyClass();
    marker.once('add', applyClass);
  }

  private matchesCurrentFilters(type: string): boolean {
    return this.activeFilters.length === 0 || this.activeFilters.includes(type);
  }

  private selectRepresentativeMarkerKeys(
    visibleEntries: Map<string, { marker: L.Marker; data: any; type: string; lat: number; lng: number }>,
  ): Set<string> {
    const selectedKeys = new Set<string>();

    if (!this.map) {
      return selectedKeys;
    }

    const zoom = this.map.getZoom();
    const cellSize = this.getGroupingCellSize(zoom);

    if (cellSize == null) {
      visibleEntries.forEach((_, key) => selectedKeys.add(key));
      return selectedKeys;
    }

    const occupiedCells = new Set<string>();

    visibleEntries.forEach((entry, key) => {
      if (key === this.activeMarkerKey) {
        selectedKeys.add(key);
        return;
      }

      const cellKey = this.toCellKey(entry.type, entry.lat, entry.lng, cellSize);
      if (occupiedCells.has(cellKey)) {
        return;
      }

      occupiedCells.add(cellKey);
      selectedKeys.add(key);
    });

    return selectedKeys;
  }

  private getGroupingCellSize(zoom: number): number | null {
    if (zoom <= 6) return 2.2;
    if (zoom <= 7) return 1.2;
    if (zoom <= 8) return 0.7;
    if (zoom <= 9) return 0.35;
    return null;
  }

  private toCellKey(type: string, lat: number, lng: number, cellSize: number): string {
    const latBucket = Math.floor(lat / cellSize);
    const lngBucket = Math.floor(lng / cellSize);
    return `${type}:${latBucket}:${lngBucket}`;
  }

  private getMarkerIconHtml(type: string): string {
    const icons: Record<string, string> = {
      destination:
        '<div style="background:#2563eb;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">📍</div>',
      hotel:
        '<div style="background:#10b981;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🏨</div>',
      restaurant:
        '<div style="background:#f59e0b;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🍽️</div>',
      kafana:
        '<div style="background:#db2777;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🍷</div>',
      event:
        '<div style="background:#8b5cf6;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🎉</div>',
      locality:
        '<div style="background:#64748b;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🏙️</div>',
      activity:
        '<div style="background:#14b8a6;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🏃</div>',
    };

    return icons[type] || icons['destination'];
  }
}
