import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { ActivityDto, ActivityService } from '../../services/activity';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import {
  LocationIntelligenceService,
  QuietZoneAddressSuggestion,
} from '../../services/location-intelligence';
import { LocalityDto, LocalityService } from '../../services/locality';
import { ObjectDto, ObjectService } from '../../services/object';
import {
  RouteBuilderPoint,
  RouteBuilderStateService,
} from '../../services/route-builder-state.service';
import { environment } from '../../../environment/environment';

type AddStopCategoryKey = 'food' | 'fuel' | 'accommodation' | 'shopping' | 'health';
type AddStopResultCategory =
  | 'destination'
  | 'object'
  | 'event'
  | 'activity'
  | 'locality'
  | 'address';

interface AddStopCategory {
  key: AddStopCategoryKey;
  label: string;
  icon: string;
}

interface AddStopResult {
  key: string;
  id: number | string;
  name: string;
  subtitle: string;
  meta: string;
  image?: string;
  lat?: number;
  lng?: number;
  category: AddStopResultCategory;
  markerType: string;
  typeName: string;
  raw: unknown;
}

@Component({
  selector: 'app-add-stop-mobile-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './add-stop-mobile-screen.component.html',
  styleUrl: './add-stop-mobile-screen.component.scss',
})
export class AddStopMobileScreenComponent implements OnInit, OnDestroy {
  readonly categories: AddStopCategory[] = [
    { key: 'food', label: 'Hrana i piće', icon: 'restaurant' },
    { key: 'fuel', label: 'Pumpe', icon: 'local_gas_station' },
    { key: 'accommodation', label: 'Smeštaj', icon: 'hotel' },
    { key: 'shopping', label: 'Šoping', icon: 'shopping_bag' },
    { key: 'health', label: 'Bolnice', icon: 'local_hospital' },
  ];

  searchQuery = '';
  activeCategory: AddStopCategoryKey | null = null;
  results: AddStopResult[] = [];
  selectedResultKey = '';
  isLoading = true;
  isSubmitting = false;
  hasMoreResults = false;
  isDesktopLayout = false;

  private readonly collapsedResultLimit = 6;
  private visibleResultLimit = this.collapsedResultLimit;
  private allItems: AddStopResult[] = [];
  private routePoints: RouteBuilderPoint[] = [];
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private latestRefreshToken = 0;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly destinationService: DestinationService,
    private readonly objectService: ObjectService,
    private readonly eventService: EventService,
    private readonly activityService: ActivityService,
    private readonly localityService: LocalityService,
    private readonly sanitizer: DomSanitizer,
    private readonly locationIntelligenceService: LocationIntelligenceService,
    private readonly routeBuilderStateService: RouteBuilderStateService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateLayoutMode();
    this.syncAddStopPageState(true);
    this.routePoints = this.routeBuilderStateService.getRoutePoints();
    await this.loadResults();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    this.syncAddStopPageState(false);
  }

  close(): void {
    void this.router.navigate(['/map']);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateLayoutMode();
  }

  onSearchChange(): void {
    this.visibleResultLimit = this.collapsedResultLimit;

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.refreshResults();
    }, 220);
  }

  setCategory(category: AddStopCategoryKey): void {
    this.activeCategory = this.activeCategory === category ? null : category;
    this.visibleResultLimit = this.collapsedResultLimit;
    void this.refreshResults();
  }

  clearAll(): void {
    this.searchQuery = '';
    this.activeCategory = null;
    this.visibleResultLimit = this.collapsedResultLimit;
    void this.refreshResults();
  }

  chooseOnMap(): void {
    this.routeBuilderStateService.requestMapPicking();
    void this.router.navigate(['/map']);
  }

  viewSelectedOnMap(): void {
    const selectedResult = this.selectedResult;
    if (!selectedResult || selectedResult.lat == null || selectedResult.lng == null) {
      return;
    }

    void this.router.navigate(['/map'], {
      state: {
        lat: selectedResult.lat,
        lng: selectedResult.lng,
        zoom: 16,
      },
    });
  }

  selectResult(item: AddStopResult): void {
    this.selectedResultKey = item.key;
  }

  isSelected(item: AddStopResult): boolean {
    return item.key === this.selectedResultKey;
  }

  showMore(): void {
    this.visibleResultLimit += this.collapsedResultLimit;
    void this.refreshResults();
  }

  get activeLabel(): string {
    return this.categories.find((category) => category.key === this.activeCategory)?.label ?? 'all';
  }

  get routeDisplayTitle(): string {
    if (this.routePoints.length === 0) {
      return 'Planned route';
    }

    if (this.routePoints.length === 1) {
      return this.routePoints[0].name;
    }

    return `${this.routePoints[0].name} + ${this.routePoints.length - 1} more stop${this.routePoints.length > 2 ? 's' : ''}`;
  }

  get selectedResult(): AddStopResult | null {
    if (!this.selectedResultKey) {
      return this.results[0] ?? null;
    }

    return this.results.find((item) => item.key === this.selectedResultKey) ?? null;
  }

  get selectedResultPreviewMapUrl(): SafeResourceUrl | null {
    const selectedResult = this.selectedResult;
    if (selectedResult?.lat == null || selectedResult.lng == null) {
      return null;
    }

    return this.buildPreviewMapUrl(selectedResult.lat, selectedResult.lng);
  }

  get desktopSectionTitle(): string {
    return this.searchQuery.trim() ? 'Search Results' : 'Recent & Suggested';
  }

  get canAddToRoute(): boolean {
    return !!this.selectedResult && this.selectedResult.lat != null && this.selectedResult.lng != null;
  }

  async addToRoute(): Promise<void> {
    const selectedResult = this.selectedResult;
    if (!selectedResult || selectedResult.lat == null || selectedResult.lng == null || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    try {
      this.routeBuilderStateService.addRoutePoint({
        id: selectedResult.id,
        name: selectedResult.name,
        type: selectedResult.markerType || selectedResult.typeName || selectedResult.category,
        lat: selectedResult.lat,
        lng: selectedResult.lng,
      });

      await this.router.navigate(['/map']);
    } finally {
      this.isSubmitting = false;
    }
  }

  private async loadResults(): Promise<void> {
    this.isLoading = true;
    this.allItems = [];
    this.results = [];

    try {
      const progressiveLoads = [
        this.resolveSource(
          this.destinationService.getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }),
          [] as DestinationDto[],
        ).then((items) => items.map((item) => this.toDestinationResult(item))),
        this.resolveSource(
          this.objectService.getAllItems({ sortBy: 'name', sortOrder: 'asc' }),
          [] as ObjectDto[],
        ).then((items) => items.map((item) => this.toObjectResult(item))),
        this.resolveSource(
          this.eventService.getAllItems({ sortBy: 'startDate', sortOrder: 'asc' }),
          [] as EventDto[],
        ).then((items) => items.map((item) => this.toEventResult(item))),
        this.resolveSource(
          this.activityService.getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }),
          [] as ActivityDto[],
        ).then((items) => items.map((item) => this.toActivityResult(item))),
        this.resolveSource(
          this.localityService.getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }),
          [] as LocalityDto[],
        ).then((items) => items.map((item) => this.toLocalityResult(item))),
      ];

      await Promise.all(
        progressiveLoads.map(async (loadPromise) => {
          const items = (await loadPromise).filter((item) => item.lat != null && item.lng != null);
          if (items.length === 0) {
            return;
          }

          const existing = new Set(this.allItems.map((item) => item.key));
          const appended = items.filter((item) => !existing.has(item.key));

          if (appended.length === 0) {
            return;
          }

          this.allItems = [...this.allItems, ...appended];
          await this.refreshResults();
          this.cdr.detectChanges();
        }),
      );
    } finally {
      this.isLoading = false;
      await this.refreshResults();
      this.cdr.detectChanges();
    }
  }

  private async refreshResults(): Promise<void> {
    const token = ++this.latestRefreshToken;
    const query = this.searchQuery.trim();
    const queryNormalized = this.normalizeText(query);
    const localResults = queryNormalized
      ? this.searchLocalResults(queryNormalized)
      : this.getRecommendedResults();

    const addressResults = queryNormalized
      ? this.toAddressResults(
          await this.locationIntelligenceService.searchAddresses(query),
          `mobile-add-stop:${token}`,
        )
      : [];

    if (token !== this.latestRefreshToken) {
      return;
    }

    const mergedResults = this.mergeResults(localResults, addressResults);
    const filteredResults = mergedResults.filter((item) => this.matchesCategory(item));

    this.hasMoreResults = filteredResults.length > this.visibleResultLimit;
    this.results = filteredResults.slice(0, this.visibleResultLimit);

    if (this.results.length === 0) {
      this.selectedResultKey = '';
      this.cdr.detectChanges();
      return;
    }

    const hasSelectedVisible = this.results.some((item) => item.key === this.selectedResultKey);
    if (!hasSelectedVisible) {
      this.selectedResultKey = this.results[0].key;
    }

    this.cdr.detectChanges();
  }

  private searchLocalResults(query: string): AddStopResult[] {
    return this.allItems
      .map((item) => ({
        item,
        score: this.scoreResult(item, query),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item);
  }

  private getSuggestedResults(): AddStopResult[] {
    const anchor = this.routePoints[this.routePoints.length - 1] ?? this.routePoints[0] ?? null;

    return this.allItems
      .slice()
      .sort((left, right) => this.scoreSuggestedDistance(left, anchor) - this.scoreSuggestedDistance(right, anchor));
  }

  private getRecommendedResults(): AddStopResult[] {
    const anchor = this.routePoints[this.routePoints.length - 1] ?? this.routePoints[0] ?? null;
    const sorted = this.getSuggestedResults();

    const destinations = sorted.filter((item) => item.category === 'destination' || item.category === 'locality');
    const objects = sorted.filter((item) => item.category === 'object');
    const activities = sorted.filter((item) => item.category === 'activity');
    const events = sorted.filter((item) => item.category === 'event');

    const picks = [
      ...this.shuffleResults(destinations).slice(0, 3),
      ...this.shuffleResults(objects).slice(0, 6),
      ...this.shuffleResults(activities).slice(0, 2),
      ...this.shuffleResults(events).slice(0, 2),
    ];

    const merged = new Map<string, AddStopResult>();
    picks.forEach((item) => merged.set(item.key, item));

    for (const item of this.shuffleResults(sorted)) {
      if (merged.size >= 24) {
        break;
      }

      merged.set(item.key, item);
    }

    if (!anchor) {
      return [...merged.values()];
    }

    return [...merged.values()].sort(
      (left, right) => this.scoreSuggestedDistance(left, anchor) - this.scoreSuggestedDistance(right, anchor),
    );
  }

  private scoreResult(item: AddStopResult, query: string): number {
    const haystacks = [
      this.normalizeText(item.name),
      this.normalizeText(item.subtitle),
      this.normalizeText(item.meta),
      this.normalizeText(item.typeName),
      this.normalizeText(item.markerType),
    ];

    let score = 0;
    for (const haystack of haystacks) {
      if (!haystack) {
        continue;
      }

      if (haystack.startsWith(query)) {
        score += 4;
      } else if (haystack.includes(query)) {
        score += 2;
      }
    }

    return score;
  }

  private scoreSuggestedDistance(item: AddStopResult, anchor: RouteBuilderPoint | null): number {
    if (!anchor || item.lat == null || item.lng == null) {
      return Number.MAX_SAFE_INTEGER;
    }

    return this.calculateDistanceMeters(anchor.lat, anchor.lng, item.lat, item.lng);
  }

  private mergeResults(localResults: AddStopResult[], addressResults: AddStopResult[]): AddStopResult[] {
    const merged = new Map<string, AddStopResult>();

    [...localResults, ...addressResults].forEach((result) => {
      if (!merged.has(result.key)) {
        merged.set(result.key, result);
      }
    });

    return [...merged.values()];
  }

  private matchesCategory(item: AddStopResult): boolean {
    if (item.category === 'address') {
      return this.searchQuery.trim().length > 0;
    }

    if (!this.activeCategory) {
      return true;
    }

    switch (this.activeCategory) {
      case 'food':
        return item.markerType === 'restaurant' || item.markerType === 'kafana';
      case 'fuel':
        return item.markerType === 'gas_station';
      case 'accommodation':
        return item.markerType === 'hotel' || item.markerType === 'apartment';
      case 'shopping':
        return ['shop', 'mall', 'market'].includes(item.markerType);
      case 'health':
        return ['pharmacy', 'hospital', 'clinic'].includes(item.markerType);
      default:
        return true;
    }
  }

  private toDestinationResult(item: DestinationDto): AddStopResult {
    return {
      key: `destination:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.regionName || item.destinationTypeName || 'Destination',
      meta: item.destinationTypeName || 'Destination',
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'destination',
      markerType: 'destination',
      typeName: item.destinationTypeName || 'Destination',
      raw: item,
    };
  }

  private toObjectResult(item: ObjectDto): AddStopResult {
    const markerType = this.getObjectType(item.objectTypeName || '');

    return {
      key: `object:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.address || item.localityName || item.destinationName || 'Object',
      meta: item.objectTypeName || 'Object',
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'object',
      markerType,
      typeName: item.objectTypeName || 'Object',
      raw: item,
    };
  }

  private toEventResult(item: EventDto): AddStopResult {
    return {
      key: `event:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.localityName || item.destinationName || 'Event',
      meta: item.eventTypeName || 'Event',
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'event',
      markerType: 'event',
      typeName: item.eventTypeName || 'Event',
      raw: item,
    };
  }

  private toActivityResult(item: ActivityDto): AddStopResult {
    return {
      key: `activity:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.localityName || item.destinationName || 'Activity',
      meta: item.activityTypeName || 'Activity',
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'activity',
      markerType: 'activity',
      typeName: item.activityTypeName || 'Activity',
      raw: item,
    };
  }

  private toLocalityResult(item: LocalityDto): AddStopResult {
    return {
      key: `locality:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.destinationName || item.regionName || 'Locality',
      meta: item.localityTypeName || 'Locality',
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'locality',
      markerType: 'locality',
      typeName: item.localityTypeName || 'Locality',
      raw: item,
    };
  }

  private toAddressResults(
    suggestions: QuietZoneAddressSuggestion[],
    source: string,
  ): AddStopResult[] {
    return suggestions.map((suggestion, index) => ({
      key: `address:${source}:${index}:${suggestion.latitude}:${suggestion.longitude}`,
      id: `address:${source}:${index}`,
      name: suggestion.displayName.split(',')[0]?.trim() || suggestion.displayName,
      subtitle: suggestion.displayName,
      meta: 'Address search result',
      lat: suggestion.latitude,
      lng: suggestion.longitude,
      category: 'address',
      markerType: 'address',
      typeName: 'Address',
      raw: suggestion,
    }));
  }

  private getObjectType(name: string): string {
    const normalized = this.normalizeText(name);

    if (normalized.includes('atm') || normalized.includes('bank') || normalized.includes('banka')) {
      return 'atm';
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

    if (normalized.includes('apartman') || normalized.includes('apartment') || normalized.includes('villa')) {
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

    if (normalized.includes('klinika') || normalized.includes('clinic') || normalized.includes('dom zdravlja')) {
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
      normalized.includes('cafeteria') ||
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

  private normalizeText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private calculateDistanceMeters(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ): number {
    const earthRadiusMeters = 6371000;
    const deltaLatitude = this.toRadians(latitude2 - latitude1);
    const deltaLongitude = this.toRadians(longitude2 - longitude1);
    const normalizedLatitude1 = this.toRadians(latitude1);
    const normalizedLatitude2 = this.toRadians(latitude2);

    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(normalizedLatitude1) *
        Math.cos(normalizedLatitude2) *
        Math.sin(deltaLongitude / 2) *
        Math.sin(deltaLongitude / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private resolveMediaUrl(path?: string | null): string | undefined {
    if (!path) {
      return undefined;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${environment.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private async resolveSource<T>(source: import('rxjs').Observable<T>, fallback: T): Promise<T> {
    return firstValueFrom(
      source.pipe(
        timeout(15000),
        catchError(() => of(fallback)),
      ),
    );
  }

  private shuffleResults(items: AddStopResult[]): AddStopResult[] {
    const copy = items.slice();

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  private updateLayoutMode(): void {
    if (typeof window === 'undefined') {
      this.isDesktopLayout = false;
      return;
    }

    this.isDesktopLayout = window.innerWidth >= 768;
  }

  private buildPreviewMapUrl(lat: number, lng: number): SafeResourceUrl {
    const delta = 0.012;
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}` +
      `&layer=mapnik&marker=${lat}%2C${lng}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private syncAddStopPageState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('route-add-stop-open', isOpen);
    document.body.classList.toggle('route-add-stop-open', isOpen);
  }
}
