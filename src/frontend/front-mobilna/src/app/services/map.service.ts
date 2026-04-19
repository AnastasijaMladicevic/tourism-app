import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class MapService {
  // Nova metoda samo za glavnu map stranicu
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
      shadowSize: [41, 41]
    });

    const marker = L.marker([lat, lng], { icon }).addTo(this.map);

    if (popupText) {
      marker.bindPopup(`<b>${popupText}</b>`, { closeButton: false });
    }

    console.log(`📍 Dodat marker: ${popupText}`);
    return marker;
  }
  private map: L.Map | null = null;

  initMap(containerId: string, lat: number = 42.424, lng: number = 18.771, zoom: number = 13): L.Map | null {
  if (this.map) {
    this.destroyMap();
  }

  try {
    this.map = L.map(containerId, {
      zoomControl: false,        // već onemogućavamo ovde
      attributionControl: false
    }).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {

      maxZoom: 19,
      attribution: ''   // prazno jer ćemo ukloniti kontrolu
    }).addTo(this.map);

    console.log(`🗺️ Mapa kreirana na koordinatama: ${lat}, ${lng}`);
    return this.map;

  } catch (error) {
    console.error('❌ Greška pri kreiranju mape:', error);
    return null;
  }
}

  addMarker(
    lat: number, 
    lng: number, 
    popupText: string = '', 
    onClick?: () => void
  ): L.Marker | null {
    
    if (!this.map) {
      console.warn('Mapa nije inicijalizovana - addMarker nije izvršen');
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

    const marker = L.marker([lat, lng], { 
      icon: customIcon 
    }).addTo(this.map);

    if (popupText) {
      marker.bindPopup(popupText, { 
        closeButton: false,
        offset: [0, -10]
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
  }

  flyTo(lat: number, lng: number, zoom: number = 16): void {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom, {
        duration: 1.5
      });
    }
  }
  /**
 * Univerzalna metoda za dodavanje markera sa tipom
 */
  addMarkerWithType(
    lat: number,
    lng: number,
    type: 'destination' | 'hotel' | 'restaurant' | 'kafana' | 'event' | 'locality' | 'activity',
    data: any,
    onClick?: () => void
  ): L.Marker | null {
  
    if (!this.map) return null;
  
    const iconHtml = this.getMarkerIconHtml(type);
  
    const customIcon = L.divIcon({
      className: 'custom-type-marker',
      html: iconHtml,
      iconSize: [46, 46],
      iconAnchor: [23, 46],
      popupAnchor: [0, -40]
    });
  
    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
  
    // Klik na marker — dispatch Angular event umesto Leaflet popup-a
    marker.on('click', () => {
      window.dispatchEvent(new CustomEvent('map-marker-clicked', {
        detail: { data, type }
      }));
      if (onClick) onClick();
    });
  
    return marker;
  }
  
  private getMarkerIconHtml(type: string): string {
    const map: any = {
      destination: `<div style="background:#2563eb;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">📍</div>`,
      hotel: `<div style="background:#10b981;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🏨</div>`,
      restaurant: `<div style="background:#f59e0b;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🍽️</div>`,
      kafana: `<div style="background:#db2777;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🍷</div>`,
      event: `<div style="background:#8b5cf6;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🎉</div>`,
      locality: `<div style="background:#64748b;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🏙️</div>`,
      activity: `<div style="background:#14b8a6;color:white;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🏃</div>`
    };

    return map[type] || map.destination;
  }

  private getTypeLabel(type: string): string {
    const labels: any = {
      hotel: 'Hotel',
      restaurant: 'Restoran',
      kafana: 'Kafana',
      event: 'Događaj',
      destination: 'Destinacija',
      locality: 'Lokalitet',
      activity: 'Aktivnost'
    };
    return labels[type] || type;
  }
  }