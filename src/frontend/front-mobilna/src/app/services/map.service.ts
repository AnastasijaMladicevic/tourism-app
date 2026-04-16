import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class MapService {

  private map: L.Map | null = null;

  initMap(containerId: string, lat: number = 42.424, lng: number = 18.771, zoom: number = 14): L.Map {
    if (this.map) this.destroyMap();

    this.map = L.map(containerId, {
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    return this.map;
  }

  addMarker(lat: number, lng: number, popupText: string = ''): L.Marker | null {
    if (!this.map) return null;

    const marker = L.marker([lat, lng]).addTo(this.map);

    if (popupText) {
      marker.bindPopup(popupText, { closeButton: false });
    }

    return marker;
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}