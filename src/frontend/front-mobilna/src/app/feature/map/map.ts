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
  selectedType: string = '';

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private eventService: EventService,
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
    this.loadAllData();
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler);
    this.mapService.destroyMap();
  }

  // ── Marker click handler ──────────────────────────────────────────────────
  private markerClickHandler = (event: any) => {
    this.ngZone.run(() => {
      this.selectedItem = event.detail.data;
      this.selectedType = event.detail.type;
    });
  };

  closeCard(): void {
    this.selectedItem = null;
    this.selectedType = '';
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  private loadAllData(): void {
    forkJoin({
      destinations: this.destinationService.getAll(),
      objects: this.objectService.getAll(),
    }).subscribe({
      next: ({ destinations, objects }) => {
        const destinationList = this.toArray<any>(destinations);
        const objectList = this.toArray<any>(objects);

        destinationList.forEach(d => {
          if (d.latitude && d.longitude) {
            this.mapService.addMarkerWithType(d.latitude, d.longitude, 'destination', d);
          }
        });

        objectList.forEach(obj => {
          if (obj.latitude && obj.longitude) {
            const type = this.getObjectType(obj.objectTypeName || '');
            this.mapService.addMarkerWithType(obj.latitude, obj.longitude, type, obj);
          }
        });
      },
      error: err => console.error('❌ Greška pri učitavanju podataka:', err),
    });
  }

  private toArray<T>(response: any): T[] {
    if (Array.isArray(response)) return response;
    if (response?.items) return response.items;
    if (response?.data) return response.data;
    return [];
  }

  private getObjectType(name: string): any {
    const n = name.toLowerCase();
    if (n.includes('hotel')) return 'hotel';
    if (n.includes('restoran')) return 'restaurant';
    if (n.includes('kafana')) return 'kafana';
    return 'restaurant';
  }

  // ── Card helpers ──────────────────────────────────────────────────────────
  getItemImage(): string {
    if (!this.selectedItem) return '';
    return this.selectedItem.mainImageUrl
      || this.selectedItem.images?.[0]?.url
      || '';
  }

  getItemLocation(): string {
    if (!this.selectedItem) return '';

    if (this.selectedType === 'destination') {
      return this.selectedItem.destinationTypeName ?? '';
    }

    const parts = [
      this.selectedItem.localityName,
      this.selectedItem.destinationName,
    ].filter(Boolean);

    return parts.join(', ');
}

  // Returns true=open, false=closed, null=no working hours
  getWorkingStatus(): boolean | null {
    const wh = this.selectedItem?.workingHours;
    if (!wh) return null;
    try {
      const parsed = typeof wh === 'string' ? JSON.parse(wh) : wh;
      const days = ['ned', 'pon', 'uto', 'sri', 'cet', 'pet', 'sub'];
      const today = days[new Date().getDay()];
      const hours = parsed[today] || parsed['pon'];
      if (!hours || hours === '00:00-24:00') return true;
      const [open, close] = hours.split('-');
      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      return cur >= toMin(open) && cur <= toMin(close);
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
        this.router.navigate(['/hotel', this.selectedItem.id]);
        break;
      case 'restaurant':
        this.router.navigate(['/restaurant', this.selectedItem.id]);
        break;
      case 'kafana':
        this.router.navigate(['/object', this.selectedItem.id]);
        break;
      case 'event':
        this.router.navigate(['/event', this.selectedItem.id]);
        break;
      default:
        // Ruta ne postoji — ostani na mapi
        break;
    }
}

  // ── Map controls ──────────────────────────────────────────────────────────
  centerOnMyLocation(): void {
    if (!navigator.geolocation) {
      alert('Geolocation nije podržana u ovom browseru.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Leti na lokaciju
        this.mapService.flyTo(lat, lng, 16);

        // Sačuvaj na backendu ako je korisnik ulogovan
        if (this.authService.isLoggedIn()) {
          this.authService.updateMyLocation(lat, lng).subscribe({
            error: err => console.error('Failed to update location:', err)
          });
        }
      },
      err => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            alert('Dozvolite pristup lokaciji u podešavanjima browsera.');
            break;
          case err.POSITION_UNAVAILABLE:
            alert('Lokacija trenutno nije dostupna.');
            break;
          default:
            alert('Nije moguće dobiti vašu lokaciju.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  zoomIn(): void { (this.mapService as any)['map']?.zoomIn(); }
  zoomOut(): void { (this.mapService as any)['map']?.zoomOut(); }
}