import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth';
import { DestinationService } from '../../services/destination';
import { EventService } from '../../services/event';
import { LocalityService } from '../../services/locality';
import { MapService } from '../../services/map.service';
import { ObjectService } from '../../services/object';

type MapSelectionState = {
  lat: number;
  lng: number;
  zoom: number;
  selectedItem?: any;
  selectedType?: string;
  focusType?: string;
  focusId?: number;
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './map.html',
  styleUrls: ['./map.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  searchQuery = '';
  selectedItem: any = null;
  selectedType = '';

  private readonly defaultLat = 42.424;
  private readonly defaultLng = 18.771;
  private readonly defaultZoom = 13;

  constructor(
    private mapService: MapService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private destinationService: DestinationService,
    private localityService: LocalityService,
    private objectService: ObjectService,
    private eventService: EventService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
  }

  ngAfterViewInit(): void {
    const initialState = this.buildInitialMapState();

    this.mapService.initMap('main-map', initialState.lat, initialState.lng, initialState.zoom);
    this.loadAllData(initialState);

    const map = (this.mapService as any)['map'];
    if (map) {
      map.on('click', () => this.closeCard());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
    this.mapService.destroyMap();
  }

  private readonly markerClickHandler = (event: Event) => {
    const markerEvent = event as CustomEvent<{ data: any; type: string }>;

    this.ngZone.run(() => {
      this.selectedItem = markerEvent.detail?.data ?? null;
      this.selectedType = markerEvent.detail?.type ?? '';
      this.cdr.detectChanges();
    });
  };

  private buildInitialMapState(): MapSelectionState {
    const state = history.state ?? {};
    const focusType = this.normalizeFocusType(this.route.snapshot.queryParamMap.get('focusType'));
    const focusIdParam = Number(this.route.snapshot.queryParamMap.get('focusId'));
    const focusId = Number.isFinite(focusIdParam) && focusIdParam > 0 ? focusIdParam : undefined;

    return {
      lat: state.lat ?? this.defaultLat,
      lng: state.lng ?? this.defaultLng,
      zoom: state.zoom ?? this.defaultZoom,
      selectedItem: state.selectedItem,
      selectedType: state.selectedType,
      focusType,
      focusId,
    };
  }

  private loadAllData(state: MapSelectionState): void {
    forkJoin({
      destinations: this.destinationService.getAll(),
      localities: this.localityService.getAll(),
      objects: this.objectService.getAll(),
      events: this.eventService.getAll(),
    }).subscribe({
      next: ({ destinations, localities, objects, events }) => {
        const destinationList = this.toArray<any>(destinations);
        const localityList = this.toArray<any>(localities);
        const objectList = this.toArray<any>(objects);
        const eventList = this.toArray<any>(events);

        destinationList.forEach((destination) => {
          if (this.hasCoordinates(destination)) {
            this.mapService.addMarkerWithType(
              destination.latitude,
              destination.longitude,
              'destination',
              destination,
            );
          }
        });

        localityList.forEach((locality) => {
          if (this.hasCoordinates(locality)) {
            this.mapService.addMarkerWithType(
              locality.latitude,
              locality.longitude,
              'locality',
              locality,
            );
          }
        });

        objectList.forEach((objectItem) => {
          if (this.hasCoordinates(objectItem)) {
            const type = this.getObjectType(objectItem.objectTypeName || '');
            this.mapService.addMarkerWithType(
              objectItem.latitude,
              objectItem.longitude,
              type,
              objectItem,
            );
          }
        });

        eventList.forEach((eventItem) => {
          if (this.hasCoordinates(eventItem)) {
            this.mapService.addMarkerWithType(
              eventItem.latitude,
              eventItem.longitude,
              'event',
              eventItem,
            );
          }
        });

        this.focusSelection(state);
      },
      error: (err) => console.error('Greska pri ucitavanju podataka za mapu:', err),
    });
  }

  private focusSelection(state: MapSelectionState): void {
    const markerType = state.selectedItem?.id ? state.selectedType : state.focusType;
    const markerId = state.selectedItem?.id ?? state.focusId;

    if (!markerType || !markerId) {
      return;
    }

    setTimeout(() => {
      this.ngZone.run(() => {
        this.mapService.triggerMarkerClick(markerType, markerId, state.zoom ?? 16);
        this.cdr.detectChanges();
      });
    }, 100);
  }

  private normalizeFocusType(value?: string | null): string | undefined {
    const normalized = (value ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'destination':
      case 'locality':
      case 'event':
        return normalized;
      default:
        return undefined;
    }
  }

  private hasCoordinates(item: any): boolean {
    return item?.latitude != null && item?.longitude != null;
  }

  private toArray<T>(response: any): T[] {
    if (Array.isArray(response)) return response;
    if (response?.items) return response.items;
    if (response?.data) return response.data;
    return [];
  }

  private getObjectType(name: string): string {
    const normalizedName = name.toLowerCase();

    if (normalizedName.includes('hotel')) return 'hotel';
    if (normalizedName.includes('restoran')) return 'restaurant';
    if (normalizedName.includes('kafana')) return 'kafana';

    return 'restaurant';
  }

  closeCard(): void {
    this.selectedItem = null;
    this.selectedType = '';

    const activeKey = (window as any).activeMarkerKey;
    if (activeKey) {
      const found = (this.mapService as any)['markerMap']?.get(activeKey);
      if (found && !(this.mapService as any)['map']?.hasLayer(found.marker)) {
        found.marker.addTo((this.mapService as any)['map']);
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

  getItemImage(): string {
    if (!this.selectedItem) return '';

    return this.selectedItem.mainImageUrl || this.selectedItem.images?.[0]?.url || '';
  }

  getItemLocation(): string {
    if (!this.selectedItem) return '';

    if (this.selectedType === 'destination') {
      return this.selectedItem.destinationTypeName ?? '';
    }

    if (this.selectedType === 'locality') {
      return this.selectedItem.destinationName ?? this.selectedItem.localityTypeName ?? '';
    }

    const parts = [this.selectedItem.localityName, this.selectedItem.destinationName].filter(Boolean);
    return parts.join(', ');
  }

  getActionLabel(): string {
    return this.selectedType === 'destination' || this.selectedType === 'locality'
      ? 'Center here'
      : 'Details';
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
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const toMinutes = (time: string) => {
        const [hoursValue, minutesValue] = time.split(':').map(Number);
        return hoursValue * 60 + minutesValue;
      };

      return currentMinutes >= toMinutes(open) && currentMinutes <= toMinutes(close);
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
      case 'locality':
        if (this.hasCoordinates(this.selectedItem)) {
          this.mapService.flyTo(this.selectedItem.latitude, this.selectedItem.longitude, 16);
        }
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
      alert('Geolocation nije podrzana u ovom browseru.');
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
            alert('Dozvolite pristup lokaciji u podesavanjima browsera.');
            break;
          case err.POSITION_UNAVAILABLE:
            alert('Lokacija trenutno nije dostupna.');
            break;
          default:
            alert('Nije moguce dobiti vasu lokaciju.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  zoomIn(): void {
    ((this.mapService as any)['map'] as any)?.zoomIn();
  }

  zoomOut(): void {
    ((this.mapService as any)['map'] as any)?.zoomOut();
  }
}

