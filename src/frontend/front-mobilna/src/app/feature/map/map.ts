import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import * as L from 'leaflet';

import { MapService } from '../../services/map.service';
import { DestinationService } from '../../services/destination';
import { ObjectService } from '../../services/object';
import { EventService } from '../../services/event';
import { ActivityService } from '../../services/activity';
import { LocalityService } from '../../services/locality';
import { RegionService } from '../../services/region';
import { ActiveRegionService } from '../../services/active-region';
import { environment } from '../../../environment/environment';

type MapItemCategory = 'destination' | 'object' | 'event' | 'activity' | 'locality';

interface SearchResult {
  id: number;
  name: string;
  typeName: string;
  location: string;
  image?: string;
  icon: string;
  lat?: number;
  lng?: number;
  raw: any;
  category: MapItemCategory;
  markerType: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './map.html',
  styleUrls: ['./map.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly TARGET_DETAIL_ZOOM = 15;

  @ViewChild('cardElement') private cardElementRef?: ElementRef<HTMLElement>;
  @ViewChild('mapPage') private mapPageRef?: ElementRef<HTMLElement>;

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;

  selectedItem: any | null = null;
  selectedType = '';
  selectedCategoryLabel = '';
  isCardVisible = false;
  cardPosition = { left: 16, top: 16 };
  allItems: SearchResult[] = [];

  private readonly markerClickHandler = (event: Event) => {
    const customEvent = event as CustomEvent<{ data: any; type: string }>;

    this.ngZone.run(() => {
      this.selectedItem = customEvent.detail.data;
      this.selectedType = customEvent.detail.type;
      this.selectedCategoryLabel = this.getItemCategoryLabel(
        customEvent.detail.data,
        customEvent.detail.type,
      );
      this.isCardVisible = false;
      this.cdr.detectChanges();
      this.focusSelectedMarker();
    });
  };

  constructor(
    private mapService: MapService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private eventService: EventService,
    private activityService: ActivityService,
    private localityService: LocalityService,
    private regionService: RegionService,
    private activeRegionService: ActiveRegionService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
  }

  ngAfterViewInit(): void {
    const state = history.state;
    const lat = state?.lat ?? 42.424;
    const lng = state?.lng ?? 18.771;
    const zoom = state?.zoom ?? 13;

    this.mapService.initMap('main-map', lat, lng, zoom, { enableClustering: true });
    if (!state?.lat || !state?.lng) {
      this.focusActiveRegion();
    }
    void this.loadAllData(state);

    const map = this.mapService.getMap();
    if (map) {
      map.on('click', () => this.closeCard());
      map.on('move zoom resize', () => this.updateCardPosition());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('map-marker-clicked', this.markerClickHandler as EventListener);
    this.mapService.destroyMap();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleCardPresentation();
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.searchResults = [];
      this.showSuggestions = false;
      return;
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = this.allItems
      .map((item) => ({
        item,
        score: this.scoreItem(item, terms),
      }))
      .filter((entry) => this.matchesAllTerms(entry.item, terms))
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);

    this.searchResults = scored.map((entry) => entry.item);
    this.showSuggestions = this.searchResults.length > 0;
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSuggestions = false;
  }

  selectSuggestion(result: SearchResult): void {
    this.searchQuery = result.name;
    this.showSuggestions = false;
    this.mapService.triggerMarkerClick(result.markerType, result.id, 16);
  }

  getItemImage(item: any = this.selectedItem): string {
    return this.resolveMediaUrl(item?.mainImageUrl || item?.images?.[0]?.url) || '';
  }

  getItemLocation(item: any = this.selectedItem, type = this.selectedType): string {
    if (!item) {
      return '';
    }

    if (type === 'destination') {
      return item.regionName ?? item.destinationTypeName ?? '';
    }

    return [item.localityName, item.destinationName, item.regionName]
      .filter(Boolean)
      .join(', ');
  }

  getWorkingStatus(item: any = this.selectedItem): boolean | null {
    const workingHours = item?.workingHours;
    if (!workingHours) {
      return null;
    }

    try {
      const parsed = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
      const days = ['ned', 'pon', 'uto', 'sri', 'cet', 'pet', 'sub'];
      const todayKey = days[new Date().getDay()];
      const hours = parsed[todayKey] || parsed['sre'] || parsed['sri'] || parsed['pon'];
      if (!hours || hours === '00:00-24:00') {
        return true;
      }

      const [open, close] = hours.split('-');
      const current = new Date().getHours() * 60 + new Date().getMinutes();
      const toMinutes = (value: string) => {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute;
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
    if (!this.selectedItem) {
      return;
    }

    const normalizedType = this.normalizeMarkerType(this.selectedType);

    if (this.selectedType === 'destination') {
      this.router.navigate(['/destination', this.selectedItem.id]);
      return;
    }
    if (this.selectedType === 'event') {
      this.router.navigate(['/event', this.selectedItem.id]);
      return;
    }
    if (this.selectedType === 'activity') {
      this.router.navigate(['/activity', this.selectedItem.id]);
      return;
    }
    if (this.selectedType === 'locality') {
      this.router.navigate(['/locality', this.selectedItem.id]);
      return;
    }
    if (normalizedType === 'hotel' || normalizedType === 'apartment') {
      this.router.navigate(['/hotel', this.selectedItem.id]);
      return;
    }
    if (normalizedType === 'restaurant' || normalizedType === 'kafana') {
      this.router.navigate(['/restaurant', this.selectedItem.id]);
      return;
    }

    this.router.navigate(['/object', this.selectedItem.id]);
  }

  onCardImageLoad(): void {
    this.scheduleCardPresentation();
  }

  closeCard(event?: Event): void {
    event?.stopPropagation();
    this.selectedItem = null;
    this.selectedType = '';
    this.selectedCategoryLabel = '';
    this.isCardVisible = false;
    this.mapService.clearMarkerFocus();
    this.cdr.detectChanges();
  }

  zoomIn(): void {
    this.mapService.getMap()?.zoomIn();
  }

  zoomOut(): void {
    this.mapService.getMap()?.zoomOut();
  }

  private matchesAllTerms(item: SearchResult, terms: string[]): boolean {
    const name = item.name.toLowerCase();
    const desc = String(item.raw?.description ?? '').toLowerCase();
    const typeName = item.typeName.toLowerCase();
    const location = item.location.toLowerCase();

    return terms.every(
      (term) =>
        name.includes(term) ||
        desc.includes(term) ||
        typeName.includes(term) ||
        location.includes(term),
    );
  }

  private scoreItem(item: SearchResult, terms: string[]): number {
    let score = 0;
    const name = item.name.toLowerCase();
    const desc = String(item.raw?.description ?? '').toLowerCase();
    const typeName = item.typeName.toLowerCase();
    const location = item.location.toLowerCase();

    for (const term of terms) {
      if (name.includes(term)) score += 3;
      if (typeName.includes(term)) score += 2;
      if (location.includes(term)) score += 1;
      if (desc.includes(term)) score += 1;
    }

    return score;
  }

  private async loadAllData(state?: any): Promise<void> {
    this.allItems = [];
    this.mapService.clearAllMarkers();

    const allObjects = await this.fetchAllObjects();

    forkJoin({
      destinations: this.destinationService
        .getAll(
          { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true, bypassLanguage: true },
        )
        .pipe(catchError(() => of([]))),
      events: this.eventService
        .getAllItems(
          { page: 1, pageSize: 500, sortBy: 'startDate', sortOrder: 'asc' },
          { bypassRegion: true, bypassLanguage: true },
        )
        .pipe(catchError(() => of([]))),
      activities: this.activityService
        .getAll(
          { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true },
        )
        .pipe(catchError(() => of([]))),
      localities: this.localityService
        .getAll(
          { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true },
        )
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ destinations, events, activities, localities }) => {
        this.toArray<any>(destinations).forEach((destination) => {
          this.addMapItem(destination, 'destination', 'destination');
        });

        allObjects.forEach((objectItem) => {
          const markerType = this.getObjectType(objectItem.objectTypeName || '');
          this.addMapItem(objectItem, markerType, 'object');
        });

        this.toArray<any>(events).forEach((event) => {
          this.addMapItem(event, 'event', 'event');
        });

        this.toArray<any>(activities).forEach((activity) => {
          this.addMapItem(activity, 'activity', 'activity');
        });

        this.toArray<any>(localities).forEach((locality) => {
          this.addMapItem(locality, 'locality', 'locality');
        });

        this.mapService.syncVisibleMarkers();

        if (state?.selectedItem) {
          setTimeout(() => {
            this.ngZone.run(() => {
              const stateMarkerType = this.resolveStateMarkerType(state.selectedItem, state.selectedType);
              this.mapService.triggerMarkerClick(stateMarkerType, state.selectedItem.id, state.zoom ?? 16);
              this.cdr.detectChanges();
            });
          }, 100);
        }
      },
      error: (error) => console.error('Greska pri ucitavanju mape:', error),
    });
  }

  private addMapItem(raw: any, markerType: string, category: MapItemCategory): void {
    if (raw?.latitude == null || raw?.longitude == null) {
      return;
    }

    this.mapService.addMarkerWithType(raw.latitude, raw.longitude, markerType, raw, undefined, false);
    this.allItems.push(this.toSearchResult(raw, markerType, category));
  }

  private async fetchAllObjects(): Promise<any[]> {
    const allObjects: any[] = [];
    let page = 1;

    while (true) {
      try {
        const response = await firstValueFrom(
          this.objectService.getAll(
            { page, pageSize: 100, sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true, bypassLanguage: true },
          ),
        );
        const items = this.toArray<any>(response);
        if (!items.length) {
          break;
        }

        allObjects.push(...items);

        const totalPages = (response as any)?.totalPages ?? 1;
        if (page >= totalPages) {
          break;
        }

        page += 1;
      } catch (error) {
        console.error('Greska pri ucitavanju objekata, stranica', page, error);
        break;
      }
    }

    return allObjects;
  }

  private toSearchResult(raw: any, markerType: string, category: MapItemCategory): SearchResult {
    const iconMap: Record<string, string> = {
      destination: 'place',
      hotel: 'hotel',
      apartment: 'apartment',
      restaurant: 'restaurant',
      kafana: 'local_bar',
      church: 'church',
      monastery: 'church',
      monument: 'account_balance',
      museum: 'museum',
      gallery: 'image',
      event: 'event',
      activity: 'directions_run',
      locality: 'location_city',
      gas_station: 'local_gas_station',
      hospital: 'local_hospital',
      clinic: 'local_hospital',
      pharmacy: 'medication',
      shop: 'shopping_bag',
      mall: 'storefront',
      attraction: 'place',
      default: 'place',
    };

    return {
      id: raw.id,
      name: raw.name,
      typeName:
        raw.objectTypeName ??
        raw.destinationTypeName ??
        raw.eventTypeName ??
        raw.activityTypeName ??
        raw.localityTypeName ??
        this.prettyMarkerType(markerType),
      location: raw.localityName ?? raw.destinationName ?? raw.regionName ?? '',
      image: this.resolveMediaUrl(raw.mainImageUrl ?? raw.images?.[0]?.url ?? ''),
      icon: iconMap[markerType] ?? iconMap['default'],
      lat: raw.latitude,
      lng: raw.longitude,
      raw,
      category,
      markerType,
    };
  }

  private toArray<T>(response: any): T[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.value)) return response.value;
    return [];
  }

  private getObjectType(name: string): string {
    const normalized = name.toLowerCase();

    if (normalized.includes('crkva') || normalized.includes('church')) {
      return 'church';
    }
    if (normalized.includes('manastir') || normalized.includes('monastery')) {
      return 'monastery';
    }
    if (normalized.includes('spomenik') || normalized.includes('monument')) {
      return 'monument';
    }
    if (normalized.includes('muzej') || normalized.includes('museum')) {
      return 'museum';
    }
    if (normalized.includes('galerija') || normalized.includes('gallery')) {
      return 'gallery';
    }
    if (
      normalized.includes('hotel') ||
      normalized.includes('albergo') ||
      normalized.includes('resort') ||
      normalized.includes('hostel') ||
      normalized.includes('motel')
    ) {
      return 'hotel';
    }
    if (
      normalized.includes('apartman') ||
      normalized.includes('apartment') ||
      normalized.includes('villa')
    ) {
      return 'apartment';
    }
    if (
      normalized.includes('pump') ||
      normalized.includes('gas') ||
      normalized.includes('fuel') ||
      normalized.includes('petrol')
    ) {
      return 'gas_station';
    }
    if (normalized.includes('apoteka') || normalized.includes('pharmacy')) {
      return 'pharmacy';
    }
    if (normalized.includes('bolnica') || normalized.includes('hospital')) {
      return 'hospital';
    }
    if (
      normalized.includes('klinika') ||
      normalized.includes('clinic') ||
      normalized.includes('dom zdravlja')
    ) {
      return 'clinic';
    }
    if (
      normalized.includes('trzni') ||
      normalized.includes('trznica') ||
      normalized.includes('mall') ||
      normalized.includes('shopping')
    ) {
      return 'mall';
    }
    if (
      normalized.includes('prodavnica') ||
      normalized.includes('shop') ||
      normalized.includes('butik') ||
      normalized.includes('market')
    ) {
      return 'shop';
    }
    if (
      normalized.includes('restoran') ||
      normalized.includes('restaurant') ||
      normalized.includes('ristorante') ||
      normalized.includes('konoba') ||
      normalized.includes('bistro') ||
      normalized.includes('pizzeria') ||
      normalized.includes('taverna')
    ) {
      return 'restaurant';
    }
    if (
      normalized.includes('kafana') ||
      normalized.includes('bar') ||
      normalized.includes('cafe') ||
      normalized.includes('kafic') ||
      normalized.includes('pub') ||
      normalized.includes('club') ||
      normalized.includes('klub') ||
      normalized.includes('winery') ||
      normalized.includes('vinarija')
    ) {
      return 'kafana';
    }

    return 'attraction';
  }

  private normalizeMarkerType(type: string): string {
    const normalized = (type ?? '').trim().toLowerCase();

    if (normalized === 'church' || normalized === 'monastery') {
      return normalized;
    }
    if (normalized === 'monument' || normalized === 'museum' || normalized === 'gallery') {
      return normalized;
    }
    if (normalized === 'bar' || normalized === 'club' || normalized === 'cafe' || normalized === 'winery') {
      return 'kafana';
    }
    if (normalized === 'resort' || normalized === 'hostel' || normalized === 'motel') {
      return 'hotel';
    }
    if (normalized === 'apartment') {
      return 'apartment';
    }

    return normalized || 'destination';
  }

  private resolveStateMarkerType(item: any, fallbackType?: string): string {
    if (fallbackType === 'destination' || fallbackType === 'event' || fallbackType === 'activity' || fallbackType === 'locality') {
      return fallbackType;
    }

    if (item?.objectTypeName) {
      return this.getObjectType(item.objectTypeName);
    }

    return this.normalizeMarkerType(fallbackType || 'destination');
  }

  private focusSelectedMarker(): void {
    if (!this.selectedItem) {
      return;
    }

    const map = this.mapService.getMap();
    const latitude = this.selectedItem.latitude;
    const longitude = this.selectedItem.longitude;
    if (!map || latitude == null || longitude == null) {
      return;
    }

    const targetLatLng = L.latLng(latitude, longitude);
    const currentZoom = map.getZoom();
    const currentCenter = map.getCenter();
    const distanceToTarget = currentCenter.distanceTo(targetLatLng);
    const isAlreadyFocused =
      currentZoom >= MapComponent.TARGET_DETAIL_ZOOM && distanceToTarget < 6;

    if (isAlreadyFocused) {
      this.scheduleCardPresentation();
      return;
    }

    map.once('moveend', () => this.scheduleCardPresentation());

    if (currentZoom < MapComponent.TARGET_DETAIL_ZOOM) {
      map.flyTo(targetLatLng, MapComponent.TARGET_DETAIL_ZOOM, { duration: 0.75 });
      return;
    }

    map.panTo(targetLatLng, { animate: true, duration: 0.45 });
  }

  private scheduleCardPresentation(): void {
    if (!this.selectedItem) {
      return;
    }

    setTimeout(() => this.presentCardForSelection(), 0);
  }

  private presentCardForSelection(): void {
    if (!this.selectedItem || !this.mapPageRef) {
      return;
    }

    const map = this.mapService.getMap();
    const cardElement = this.cardElementRef?.nativeElement;
    if (!map || !cardElement) {
      return;
    }

    const latitude = this.selectedItem.latitude;
    const longitude = this.selectedItem.longitude;
    if (latitude == null || longitude == null) {
      return;
    }

    const cardWidth = cardElement.offsetWidth;
    const cardHeight = cardElement.offsetHeight;
    const latLng: [number, number] = [latitude, longitude];

    if (!this.needsMapPanForCard(latLng, cardWidth, cardHeight)) {
      this.isCardVisible = true;
      this.updateCardPosition();
      this.cdr.detectChanges();
      return;
    }

    this.isCardVisible = false;
    this.cdr.detectChanges();

    const markerId = this.selectedItem.id;
    map.once('moveend', () => {
      if (!this.selectedItem || this.selectedItem.id !== markerId) {
        return;
      }

      this.isCardVisible = true;
      this.updateCardPosition();
      this.cdr.detectChanges();
    });

    const horizontalPadding = Math.ceil(cardWidth / 2) + 16;
    const topPadding = 96;
    const bottomPadding = cardHeight + 48;

    map.panInside(latLng, {
      paddingTopLeft: [horizontalPadding, topPadding],
      paddingBottomRight: [horizontalPadding, bottomPadding],
      animate: true,
      duration: 0.35,
    });
  }

  private updateCardPosition(): void {
    if (!this.selectedItem || !this.mapPageRef || !this.isCardVisible) {
      return;
    }

    const map = this.mapService.getMap();
    const cardElement = this.cardElementRef?.nativeElement;
    if (!map || !cardElement) {
      return;
    }

    const latitude = this.selectedItem.latitude;
    const longitude = this.selectedItem.longitude;
    if (latitude == null || longitude == null) {
      return;
    }

    const mapPage = this.mapPageRef.nativeElement;
    const mapWidth = mapPage.clientWidth;
    const mapHeight = mapPage.clientHeight;
    const cardWidth = cardElement.offsetWidth;
    const cardHeight = cardElement.offsetHeight;
    const markerPoint = map.latLngToContainerPoint([latitude, longitude]);

    const horizontalMargin = 16;
    const verticalMargin = 16;
    const cardOffset = 18;

    let left = markerPoint.x - cardWidth / 2;
    left = Math.max(horizontalMargin, Math.min(left, mapWidth - cardWidth - horizontalMargin));

    let top = markerPoint.y + cardOffset;
    top = Math.max(verticalMargin, Math.min(top, mapHeight - cardHeight - verticalMargin));

    this.cardPosition = { left, top };
    this.cdr.detectChanges();
  }

  private needsMapPanForCard(
    latLng: [number, number],
    cardWidth: number,
    cardHeight: number,
  ): boolean {
    const map = this.mapService.getMap();
    const mapPage = this.mapPageRef?.nativeElement;
    if (!map || !mapPage) {
      return false;
    }

    const markerPoint = map.latLngToContainerPoint(latLng);
    const horizontalPadding = Math.ceil(cardWidth / 2) + 16;
    const topPadding = 96;
    const bottomPadding = cardHeight + 48;

    return (
      markerPoint.x < horizontalPadding ||
      markerPoint.x > mapPage.clientWidth - horizontalPadding ||
      markerPoint.y < topPadding ||
      markerPoint.y > mapPage.clientHeight - bottomPadding
    );
  }

  private getItemCategoryLabel(item: any, type: string): string {
    if (!item) {
      return '';
    }

    return (
      item.objectTypeName ??
      item.destinationTypeName ??
      item.eventTypeName ??
      item.activityTypeName ??
      item.localityTypeName ??
      this.prettyMarkerType(type)
    );
  }

  private prettyMarkerType(type: string): string {
    switch (this.normalizeMarkerType(type)) {
      case 'destination':
        return 'Destinacija';
      case 'hotel':
        return 'Hotel';
      case 'apartment':
        return 'Apartman';
      case 'restaurant':
        return 'Restoran';
      case 'kafana':
        return 'Bar / Kafana';
      case 'church':
        return 'Crkva';
      case 'monastery':
        return 'Manastir';
      case 'monument':
        return 'Spomenik';
      case 'museum':
        return 'Muzej';
      case 'gallery':
        return 'Galerija';
      case 'event':
        return 'Dogadjaj';
      case 'activity':
        return 'Aktivnost';
      case 'locality':
        return 'Lokalitet';
      case 'gas_station':
        return 'Pumpa';
      case 'hospital':
      case 'clinic':
        return 'Bolnica';
      case 'pharmacy':
        return 'Apoteka';
      case 'shop':
      case 'mall':
        return 'Prodavnica';
      default:
        return 'Objekat';
    }
  }

  private focusActiveRegion(): void {
    const activeRegionId = this.activeRegionService.getActiveRegionId();
    const regionRequest = activeRegionId
      ? this.regionService.getById(activeRegionId)
      : this.regionService.getDefault();

    regionRequest.subscribe({
      next: (region) => {
        if (region.centerLatitude == null || region.centerLongitude == null) {
          return;
        }

        this.mapService.flyTo(
          region.centerLatitude,
          region.centerLongitude,
          Math.round(region.defaultMapZoom ?? 8),
        );
      },
      error: () => {
        this.activeRegionService.setActiveRegionId(null);
        this.regionService.getDefault().subscribe({
          next: (fallbackRegion) => {
            if (
              fallbackRegion.centerLatitude == null ||
              fallbackRegion.centerLongitude == null
            ) {
              return;
            }

            this.mapService.flyTo(
              fallbackRegion.centerLatitude,
              fallbackRegion.centerLongitude,
              Math.round(fallbackRegion.defaultMapZoom ?? 8),
            );
          },
        });
      },
    });
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) {
      return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) {
      return `${apiBase}${trimmed}`;
    }

    return `${apiBase}/${trimmed}`;
  }
}
