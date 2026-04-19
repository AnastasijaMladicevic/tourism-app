import { Component, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  @Input() mapId: string = 'map-' + Math.random().toString(36).substr(2, 9); // dinamički ID

  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['lat'] || changes['lng']) && !changes['lat']?.firstChange) {
      this.initMap();
    }
  }

  private initMap(): void {
    console.log('MAP INIT:', this.mapId, this.lat, this.lng);
    if (!this.lat || !this.lng) return;

    this.mapService.initMap(this.mapId, this.lat, this.lng, this.zoom);

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

    this.mapService.addMarker(this.lat, this.lng, this.popupText);
  }

  ngOnDestroy(): void {
    this.mapService.destroyMap();
  }
}