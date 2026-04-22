import { Component, OnInit, AfterViewInit, OnDestroy, ViewEncapsulation, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MapService } from '../../services/map.service';
import { DestinationService } from '../../services/destination';
import { ObjectService } from '../../services/object';
import { EventService } from '../../services/event';
import { AuthService } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './map.html',
  styleUrls: ['./map.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  searchQuery = '';
  selectedItem: any = null;
  selectedType = '';
  private currentMarker: any = null;

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private eventService: EventService,
    private translationService: TranslationService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('map-marker-clicked', (event: any) => {
      this.ngZone.run(() => {
        this.selectedItem = event.detail.data;
        this.selectedType = event.detail.type;
        this.cdr.detectChanges();
      });
    });
  }

  ngAfterViewInit(): void {
    const state = history.state;
    const lat = state?.lat ?? 42.424;
    const lng = state?.lng ?? 18.771;
    const zoom = state?.zoom ?? 13;

    this.mapService.initMap('main-map', lat, lng, zoom);
    this.loadAllData(state);

    const map = (this.mapService as any).map;
    if (map) {
      map.on('click', () => this.closeCard());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler);
    this.mapService.destroyMap();
  }

  private markerClickHandler = (event: any) => {
    this.ngZone.run(() => {
      this.selectedItem = event.detail.data;
      this.selectedType = event.detail.type;
    });
  };

  closeCard(): void {
    this.selectedItem = null;
    this.selectedType = '';

    const activeKey = (window as any).activeMarkerKey;
    if (activeKey) {
      const found = (this.mapService as any).markerMap?.get(activeKey);
      if (found && !(this.mapService as any).map?.hasLayer(found.marker)) {
        found.marker.addTo((this.mapService as any).map);
      }
      (window as any).activeMarkerKey = null;
    }

    const regularMarker = (window as any).currentRegularMarker;
    if (regularMarker) {
      regularMarker.remove();
      (window as any).currentRegularMarker = null;
    }

    this.cdr.detectChanges();
  }

  private loadAllData(state?: any): void {
    forkJoin({
      destinations: this.destinationService.getAll(),
      objects: this.objectService.getAll(),
      events: this.eventService.getAll(),
    }).subscribe({
      next: ({ destinations, objects, events }) => {
        const destinationList = this.toArray<any>(destinations);
        const objectList = this.toArray<any>(objects);
        const eventList = this.toArray<any>(events);

        destinationList.forEach((destination) => {
          if (destination.latitude && destination.longitude) {
            this.mapService.addMarkerWithType(destination.latitude, destination.longitude, 'destination', destination);
          }
        });

        objectList.forEach((obj) => {
          if (obj.latitude && obj.longitude) {
            const type = this.getObjectType(obj.objectTypeName || '');
            this.mapService.addMarkerWithType(obj.latitude, obj.longitude, type, obj);
          }
        });

        eventList.forEach((event) => {
          if (event.latitude && event.longitude) {
            this.mapService.addMarkerWithType(event.latitude, event.longitude, 'event', event);
          }
        });

        if (state?.selectedItem) {
          setTimeout(() => {
            this.ngZone.run(() => {
              const type = state.selectedType || 'object';
              this.mapService.triggerMarkerClick(type, state.selectedItem.id, state.zoom ?? 16);
              this.cdr.detectChanges();
            });
          }, 100);
        }
      },
      error: (err) => console.error('Failed to load map data:', err),
    });
  }

  private toArray<T>(response: any): T[] {
    if (Array.isArray(response)) return response;
    if (response?.items) return response.items;
    if (response?.data) return response.data;
    return [];
  }

  private getObjectType(name: string): any {
    const normalized = name.toLowerCase();
    if (normalized.includes('hotel')) return 'hotel';
    if (normalized.includes('restoran')) return 'restaurant';
    if (normalized.includes('kafana')) return 'kafana';
    return 'restaurant';
  }

  getItemImage(): string {
    if (!this.selectedItem) return '';
    return this.selectedItem.mainImageUrl || this.selectedItem.images?.[0]?.url || '';
  }

  getItemLocation(): string {
    if (!this.selectedItem) return '';

    if (this.selectedType === 'destination') {
      return this.selectedItem.destinationTypeName ?? '';
    }

    const parts = [this.selectedItem.localityName, this.selectedItem.destinationName].filter(Boolean);
    return parts.join(', ');
  }

  getWorkingStatus(): boolean | null {
    const workingHours = this.selectedItem?.workingHours;
    if (!workingHours) return null;

    try {
      const parsed = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
      const days = ['ned', 'pon', 'uto', 'sri', 'cet', 'pet', 'sub'];
      const today = days[new Date().getDay()];
      const hours = parsed[today] || parsed['pon'];
      if (!hours || hours === '00:00-24:00') return true;

      const [open, close] = hours.split('-');
      const now = new Date();
      const current = now.getHours() * 60 + now.getMinutes();
      const toMinutes = (value: string) => {
        const [hoursPart, minutesPart] = value.split(':').map(Number);
        return hoursPart * 60 + minutesPart;
      };

      return current >= toMinutes(open) && current <= toMinutes(close);
    } catch {
      return null;
    }
  }

  formatDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
  }

  openDetails(): void {
    if (!this.selectedItem) return;

    switch (this.selectedType) {
      case 'destination':
        this.router.navigate(['/destination', this.selectedItem.id]);
        break;
      case 'hotel':
      case 'restaurant':
      case 'kafana':
        this.router.navigate(['/object', this.selectedItem.id]);
        break;
      case 'event':
        this.router.navigate(['/event', this.selectedItem.id]);
        break;
      default:
        break;
    }
  }

  centerOnMyLocation(): void {
    if (!navigator.geolocation) {
      alert(this.translationService.translate('map.geoUnsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.mapService.flyTo(lat, lng, 16);

        if (this.authService.isLoggedIn()) {
          this.authService.updateMyLocation(lat, lng).subscribe({
            error: (err) => console.error('Failed to update location:', err),
          });
        }
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            alert(this.translationService.translate('map.geoDenied'));
            break;
          case err.POSITION_UNAVAILABLE:
            alert(this.translationService.translate('map.geoUnavailable'));
            break;
          default:
            alert(this.translationService.translate('map.geoFailed'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  zoomIn(): void {
    (this.mapService as any).map?.zoomIn();
  }

  zoomOut(): void {
    (this.mapService as any).map?.zoomOut();
  }
}
