import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class MapService {
  private markers: Array<{ marker: L.Marker; data: any; type: string; lat: number; lng: number }> = [];
  private markerMap = new Map<string, { marker: L.Marker; data: any; type: string; lat: number; lng: number }>();
  private activeMarkerKey: string | null = null;
  private activeRegularMarker: L.Marker | null = null;
  private map: L.Map | null = null;

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
  ): L.Marker | null {
    if (!this.map) return null;

    const customIcon = L.divIcon({
      className: 'custom-type-marker',
      html: this.getMarkerIconHtml(),
      iconSize: [38, 46],
      iconAnchor: [19, 44],
      popupAnchor: [0, -38],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    this.markers.push({ marker, data, type, lat, lng });

    const key = `${type}:${data.id}`;
    this.markerMap.set(key, { marker, data, type, lat, lng });

    marker.on('click', () => {
      this.activateMarker(key);
      if (onClick) onClick();
    });

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

  private getMarkerIconHtml(): string {
    return `
      <div style="width:32px;height:32px;border:2px solid #fff;border-radius:50% 50% 50% 0;background:#168aad;box-shadow:0 8px 18px rgba(15,23,42,0.26);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:14px;line-height:1;">📍</span>
      </div>
    `;
  }
}
