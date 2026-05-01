import { Component, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
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

    if (!this.interactive) {
      const map = this.mapService['map'];
      if (map) {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.zoomControl?.remove();
      }
    }

    this.renderMarker();
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
  }

  ngOnDestroy(): void {
    if (this.transitionTimeoutId) {
      clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
    this.mapService.destroyMap();
  }
}