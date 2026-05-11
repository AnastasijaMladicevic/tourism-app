import { Component, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div [id]="mapId" style="height: 280px; width: 100%; border-radius: 16px;"></div>`,
})
export class MapComponent implements AfterViewInit, OnDestroy, OnChanges {

  @Input() lat: number = 42.424;
  @Input() lng: number = 18.771;
  @Input() zoom: number = 15;
  @Input() popupText: string = '';
  @Input() interactive: boolean = false;
  @Input() showMarker: boolean = true;
  @Input() mapId: string = 'map-' + Math.random().toString(36).substr(2, 9); // dinamički ID
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number }>();

  private marker: L.Marker | null = null;
  private transitionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private mapInitialized = false;

  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapInitialized) {
      return;
    }

    if ((changes['lat'] || changes['lng']) && !changes['lat']?.firstChange) {
      this.animateToLocation();
      return;
    }

    if (changes['showMarker'] || changes['popupText']) {
      this.renderMarker();
    }
  }

  private initMap(): void {
    console.log('MAP INIT:', this.mapId, this.lat, this.lng);
    if (!this.lat || !this.lng) return;

    this.mapService.initMap(this.mapId, this.lat, this.lng, this.zoom);
    this.mapInitialized = true;
    const map = this.mapService.getMap();

    if (!this.interactive) {
      if (map) {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.zoomControl?.remove();
      }
    } else if (map) {
      map.on('click', (event: L.LeafletMouseEvent) => {
        this.lat = event.latlng.lat;
        this.lng = event.latlng.lng;
        this.renderMarker();
        this.locationSelected.emit({ lat: this.lat, lng: this.lng });
      });
    }

    this.renderMarker();

    // When map is mounted inside dynamic/sticky containers, force a re-measure
    // so tile layers render reliably instead of staying gray.
    setTimeout(() => {
      const latestMap = this.mapService.getMap();
      if (!latestMap) {
        return;
      }

      latestMap.invalidateSize();
      latestMap.setView([this.lat, this.lng], this.zoom);
    }, 120);
  }

  private animateToLocation(): void {
    if (!this.lat || !this.lng) {
      return;
    }

    const map = this.mapService['map'] as L.Map | null;
    if (!map) {
      this.initMap();
      return;
    }

    if (this.transitionTimeoutId) {
      clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }

    const currentZoom = map.getZoom();
    const panOutZoom = Math.max(5, currentZoom - 2);
    const targetZoom = Math.max(this.zoom, currentZoom);

    map.flyTo([this.lat, this.lng], panOutZoom, { duration: 0.35 });

    this.transitionTimeoutId = setTimeout(() => {
      map.flyTo([this.lat, this.lng], targetZoom, { duration: 0.75 });
      this.renderMarker();
      this.transitionTimeoutId = null;
    }, 220);
  }

  private renderMarker(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }

    if (!this.showMarker || !this.lat || !this.lng) {
      return;
    }

    this.marker = this.mapService.addMarker(this.lat, this.lng, this.popupText);
    if (this.interactive && this.marker) {
      this.marker.dragging?.enable();
      this.marker.on('dragend', () => {
        const point = this.marker?.getLatLng();
        if (!point) {
          return;
        }
        this.lat = point.lat;
        this.lng = point.lng;
        this.locationSelected.emit({ lat: this.lat, lng: this.lng });
      });
    }
    if (this.marker && this.popupText) {
      this.marker.openPopup();
    }
  }

  ngOnDestroy(): void {
    if (this.transitionTimeoutId) {
      clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
    this.mapService.destroyMap();
  }
}