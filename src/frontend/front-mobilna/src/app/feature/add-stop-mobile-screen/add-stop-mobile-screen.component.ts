import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostBinding, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationExtras, Router } from '@angular/router';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { ActivityDto, ActivityService } from '../../services/activity';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import { LocalityDto, LocalityService } from '../../services/locality';
import { ObjectDto, ObjectService } from '../../services/object';
import {
  RouteBuilderPoint,
  RouteBuilderStateService,
} from '../../services/route-builder-state.service';
import { LocationTrackingService } from '../../services/location-tracking';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environment/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type AddStopCategoryKey = 'food' | 'fuel' | 'accommodation' | 'shopping' | 'health';
type AddStopResultCategory =
  | 'destination'
  | 'object'
  | 'event'
  | 'activity'
  | 'locality';

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

type SearchIntent = 'event' | 'food' | 'fuel' | 'accommodation' | 'shopping' | 'health' | null;

interface SearchContext {
  intent: SearchIntent;
  locationCandidate: AddStopResult | null;
}

@Component({
  selector: 'app-add-stop-mobile-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
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
  recentResults: AddStopResult[] = [];
  suggestedResults: AddStopResult[] = [];
  relatedResults: AddStopResult[] = [];
  selectedResultKey = '';
  isLoading = true;
  isSubmitting = false;
  hasMoreResults = false;
  isDesktopLayout = false;
  showLocationAlreadyInRouteHint = false;

  @HostBinding('class.add-stop-host--desktop')
  get isDesktopHost(): boolean {
    return this.isDesktopLayout;
  }

  private readonly collapsedResultLimit = 6;
  private visibleResultLimit = this.collapsedResultLimit;
  private allItems: AddStopResult[] = [];
  private routePoints: RouteBuilderPoint[] = [];
  private recentHistory: AddStopResult[] = [];
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private latestRefreshToken = 0;
  private readonly recentStorageKey = 'route-add-stop-recent-v2';

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly destinationService: DestinationService,
    private readonly objectService: ObjectService,
    private readonly eventService: EventService,
    private readonly activityService: ActivityService,
    private readonly localityService: LocalityService,
    private readonly sanitizer: DomSanitizer,
    private readonly routeBuilderStateService: RouteBuilderStateService,
    private readonly locationTrackingService: LocationTrackingService,
    private readonly translationService: TranslationService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateLayoutMode();
    this.syncAddStopPageState(true);
    this.routePoints = this.routeBuilderStateService.getRoutePoints();
    this.recentHistory = this.readRecentHistory();
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
    void this.navigateBackToMap();
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

  clearRecentHistory(): void {
    this.recentHistory = [];
    this.persistRecentHistory();
    void this.refreshResults();
  }

  chooseOnMap(): void {
    this.routeBuilderStateService.requestMapPicking();
    void this.navigateBackToMap();
  }

  viewSelectedOnMap(): void {
    const selectedResult = this.selectedResult;
    if (!selectedResult || selectedResult.lat == null || selectedResult.lng == null) {
      return;
    }
    void this.navigateBackToMap({
      state: {
        lat: selectedResult.lat,
        lng: selectedResult.lng,
        zoom: 16,
      },
    });
  }

  selectResult(item: AddStopResult): void {
    this.selectedResultKey = item.key;
    this.storeRecentItem(item);
    this.refreshRelatedResultsForSelection();
  }

  selectAndAdd(item: AddStopResult): void {
    this.selectedResultKey = item.key;
    this.storeRecentItem(item);
    void this.addToRoute();
  }

  isSelected(item: AddStopResult): boolean {
    return item.key === this.selectedResultKey;
  }

  showMore(): void {
    this.visibleResultLimit += this.collapsedResultLimit;
    void this.refreshResults();
  }

  getCategoryLabel(categoryKey: AddStopCategoryKey): string {
    return this.translate(`map.filters.${categoryKey}`);
  }

  get activeLabel(): string {
    return this.activeCategory ? this.getCategoryLabel(this.activeCategory) : this.translate('common.all');
  }

  get isSearchActive(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  get routeDisplayTitle(): string {
    if (this.routePoints.length === 0) {
      return this.translate('map.addStop.plannedRoute');
    }

    if (this.routePoints.length === 1) {
      return this.routePoints[0].name;
    }

    const extraStops = this.routePoints.length - 1;
    const extraLabel = extraStops === 1
      ? this.translate('map.routePlanner.oneMoreStop')
      : this.translate('map.routePlanner.moreStops', { count: extraStops });

    return `${this.routePoints[0].name} + ${extraLabel}`;
  }

  get selectedResult(): AddStopResult | null {
    const visibleItems = [...this.results, ...this.relatedResults, ...this.recentResults, ...this.suggestedResults];

    if (!this.selectedResultKey) {
      return visibleItems[0] ?? null;
    }

    return visibleItems.find((item) => item.key === this.selectedResultKey) ?? null;
  }

  get selectedResultPreviewMapUrl(): SafeResourceUrl | null {
    const selectedResult = this.selectedResult;
    if (selectedResult?.lat == null || selectedResult.lng == null) {
      return null;
    }

    return this.buildPreviewMapUrl(selectedResult.lat, selectedResult.lng);
  }

  get desktopSectionTitle(): string {
    return this.isSearchActive
      ? this.translate('map.addStop.searchResults')
      : this.translate('map.addStop.recent');
  }

  get showMoreLabel(): string {
    return this.isSearchActive
      ? this.translate('map.addStop.showMoreResults')
      : this.translate('map.addStop.showMoreSuggestions');
  }

  get suggestedSectionTitle(): string {
    if (this.activeCategory) {
      return this.translate('map.addStop.alongRouteWithCategory', { category: this.activeLabel });
    }

    return this.translate('map.addStop.suggestedAlongRoute');
  }

  get relatedSectionTitle(): string {
    const selected = this.selectedResult;
    if (!selected) {
      return this.translate('map.addStop.relatedSuggestions');
    }

    if (this.isLocationLike(selected)) {
      return this.translate('map.addStop.popularIn', { name: selected.name });
    }

    if (this.activeCategory) {
      return this.translate('map.addStop.moreNearby', { category: this.activeLabel });
    }

    return this.translate('map.addStop.moreLike', { name: selected.name });
  }

  get shouldShowRecentSection(): boolean {
    return !this.isSearchActive && this.recentResults.length > 0;
  }

  get shouldShowSuggestedSection(): boolean {
    return !this.isSearchActive && this.suggestedResults.length > 0;
  }

  get shouldShowSearchResultsSection(): boolean {
    return this.isSearchActive;
  }

  get shouldShowRelatedSection(): boolean {
    return this.relatedResults.length > 0;
  }

  get canAddToRoute(): boolean {
    return !!this.selectedResult && this.selectedResult.lat != null && this.selectedResult.lng != null;
  }

  async useMyLocation(): Promise<void> {
    const isTracking = this.locationTrackingService.isTrackingEnabled();
    const location = this.locationTrackingService.getCurrentLocation();

    if (!isTracking || !location) {
      await this.navigateBackToMap({ state: { openLocationConsent: true } });
      return;
    }

    const currentPoints = this.routeBuilderStateService.getRoutePoints();
    const alreadyInRoute = currentPoints.some((p) => p.id === -1 && p.type === 'gps');
    if (alreadyInRoute) {
      this.showLocationAlreadyInRouteHint = true;
      setTimeout(() => {
        this.showLocationAlreadyInRouteHint = false;
        this.cdr.detectChanges();
      }, 2500);
      this.cdr.detectChanges();
      return;
    }

    this.routeBuilderStateService.prependRoutePoint({
      id: -1,
      name: this.translate('map.routePlanner.myLocation'),
      type: 'gps',
      lat: location.latitude,
      lng: location.longitude,
    });
    await this.navigateBackToMap();
  }

  async addToRoute(): Promise<void> {
    const selectedResult = this.selectedResult;
  
    if (!selectedResult || selectedResult.lat == null || selectedResult.lng == null || this.isSubmitting) {
      return;
    }
  
    this.isSubmitting = true;
  
    try {
      this.storeRecentItem(selectedResult);
  
      const markerId = Number(selectedResult.id);
  
      this.routeBuilderStateService.addRoutePoint({
        id: selectedResult.id,
        name: selectedResult.name,
        type: selectedResult.markerType || selectedResult.typeName || selectedResult.category,
        lat: selectedResult.lat,
        lng: selectedResult.lng,
        markerType: selectedResult.markerType || selectedResult.category,
        markerId: Number.isFinite(markerId) ? markerId : undefined,
      });
  
      await this.navigateBackToMap();
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
          this.destinationService.getAll(
            { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true, bypassLanguage: true },
          ),
          [] as DestinationDto[],
        ).then((items) => items.map((item) => this.toDestinationResult(item))),
        this.resolveSource(
          this.objectService.getAllItems(
            { sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true, bypassLanguage: true },
          ),
          [] as ObjectDto[],
        ).then((items) => items.map((item) => this.toObjectResult(item))),
        this.resolveSource(
          this.eventService.getAllItems(
            { sortBy: 'startDate', sortOrder: 'asc' },
            { bypassRegion: true, bypassLanguage: true },
          ),
          [] as EventDto[],
        ).then((items) => items.map((item) => this.toEventResult(item))),
        this.resolveSource(
          this.activityService.getAll(
            { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true },
          ),
          [] as ActivityDto[],
        ).then((items) => items.map((item) => this.toActivityResult(item))),
        this.resolveSource(
          this.localityService.getAll(
            { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true },
          ),
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
    const query = this.searchQuery.trim();
    const queryNormalized = this.normalizeText(query);
    ++this.latestRefreshToken;

    this.recentResults = !queryNormalized ? this.getRecentResults() : [];

    if (queryNormalized) {
      const mergedResults = this.searchLocalResults(queryNormalized).filter((item) => this.matchesCategory(item));
      const searchContext = this.buildSearchContext(mergedResults, queryNormalized);
      const rankedResults = this.rankSearchResults(mergedResults, queryNormalized, searchContext);

      this.hasMoreResults = rankedResults.length > this.visibleResultLimit;
      this.results = rankedResults.slice(0, this.visibleResultLimit);
      this.suggestedResults = [];

      if (this.results.length === 0) {
        this.relatedResults = [];
        this.selectedResultKey = '';
        this.cdr.detectChanges();
        return;
      }

      const selectedVisible = this.results.some((item) => item.key === this.selectedResultKey);
      if (!selectedVisible) {
        this.selectedResultKey = this.pickPrimarySearchResult(this.results, searchContext)?.key ?? this.results[0].key;
      }

      this.refreshRelatedResultsForSelection(searchContext);
    } else {
      const suggestedPool = this.getRecommendedResults();
      this.hasMoreResults = suggestedPool.length > this.visibleResultLimit;
      this.suggestedResults = suggestedPool.slice(0, this.visibleResultLimit);
      this.results = [];
      this.relatedResults = [];

      const visibleItems = [...this.recentResults, ...this.suggestedResults];
      const hasSelectedVisible = visibleItems.some((item) => item.key === this.selectedResultKey);
      if (!hasSelectedVisible) {
        this.selectedResultKey = visibleItems[0]?.key ?? '';
      }
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
    const sorted = this.getSuggestedResults().filter((item) => this.matchesCategory(item));
    const locations = sorted.filter((item) => this.isLocationLike(item));
    const venues = sorted.filter((item) => !this.isLocationLike(item));

    const picks = [...locations.slice(0, 3), ...venues.slice(0, 12)];

    const merged = new Map<string, AddStopResult>();
    picks.forEach((item) => merged.set(item.key, item));

    for (const item of sorted) {
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
    const name = this.normalizeText(item.name);
    const subtitle = this.normalizeText(item.subtitle);
    const meta = this.normalizeText(item.meta);
    const typeName = this.normalizeText(item.typeName);
    const markerType = this.normalizeText(item.markerType);
    const haystacks = [name, subtitle, meta, typeName, markerType];
    const tokens = query.split(/\s+/).filter((token) => token.length > 1);
    const intent = this.detectSearchIntent(query);
    let score = 0;
    let textMatched = false;

    if (name === query) {
      score += 26;
      textMatched = true;
    } else if (name.startsWith(query)) {
      score += 18;
      textMatched = true;
    } else if (name.includes(query)) {
      score += 12;
      textMatched = true;
    }

    if (subtitle.includes(query)) {
      score += 9;
      textMatched = true;
    }

    for (const token of tokens) {
      if (name.startsWith(token)) {
        score += 7;
        textMatched = true;
      } else if (name.includes(token)) {
        score += 5;
        textMatched = true;
      }

      if (subtitle.includes(token)) {
        score += 4;
        textMatched = true;
      }

      if (meta.includes(token) || typeName.includes(token) || markerType.includes(token)) {
        score += 3;
        textMatched = true;
      }
    }

    if (tokens.length > 1 && tokens.every((token) => haystacks.some((haystack) => haystack.includes(token)))) {
      score += 8;
      textMatched = true;
    }

    if (!textMatched) {
      return 0;
    }

    if (this.activeCategory && this.matchesCategory(item)) {
      score += 6;
    }

    if (intent && this.matchesSearchIntent(item, intent)) {
      score += 7;
    }

    if (this.isLocationLike(item)) {
      score += 2;
    }

    return score;
  }

  private buildSearchContext(results: AddStopResult[], query: string): SearchContext {
    const intent = this.detectSearchIntent(query);
    const locationCandidate = this.pickLocationContextResult(results, query);

    return { intent, locationCandidate };
  }

  private rankSearchResults(results: AddStopResult[], query: string, context: SearchContext): AddStopResult[] {
    return results
      .map((item) => ({
        item,
        score: this.scoreSearchDisplayResult(item, query, context),
      }))
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item);
  }

  private scoreSearchDisplayResult(item: AddStopResult, query: string, context: SearchContext): number {
    let score = this.scoreResult(item, query);

    if (context.locationCandidate) {
      if (item.key === context.locationCandidate.key) {
        score += context.intent ? 8 : 24;
      } else if (this.matchesLocationContext(item, context.locationCandidate)) {
        score += 14;
      }
    }

    if (context.intent && this.matchesSearchIntent(item, context.intent)) {
      score += 12;
    }

    if (context.intent && context.locationCandidate && this.matchesLocationContext(item, context.locationCandidate)) {
      score += this.matchesSearchIntent(item, context.intent) ? 18 : 0;
    }

    return score;
  }

  private pickPrimarySearchResult(results: AddStopResult[], context: SearchContext): AddStopResult | null {
    if (context.intent) {
      const intentMatchInLocation = results.find(
        (item) =>
          this.matchesSearchIntent(item, context.intent) &&
          (!!context.locationCandidate ? this.matchesLocationContext(item, context.locationCandidate) : true),
      );

      if (intentMatchInLocation) {
        return intentMatchInLocation;
      }
    }

    if (context.locationCandidate) {
      return context.locationCandidate;
    }

    return results.find((item) => this.isLocationLike(item)) ?? results[0] ?? null;
  }

  private pickLocationContextResult(results: AddStopResult[], query: string): AddStopResult | null {
    const locationTerms = this.extractLocationTerms(query);
    if (locationTerms.length === 0) {
      return null;
    }

    return results
      .filter((item) => this.isLocationLike(item))
      .map((item) => ({
        item,
        score: this.scoreLocationContextResult(item, locationTerms),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.item ?? null;
  }

  private scoreLocationContextResult(item: AddStopResult, locationTerms: string[]): number {
    const haystack = this.describeItem(item);
    let score = 0;

    for (const term of locationTerms) {
      if (this.normalizeText(item.name) === term) {
        score += 18;
      } else if (this.normalizeText(item.name).startsWith(term)) {
        score += 12;
      } else if (haystack.includes(term)) {
        score += 8;
      }
    }

    return score;
  }

  private getRecentResults(): AddStopResult[] {
    return this.recentHistory
      .filter((item) => this.matchesCategory(item))
      .slice(0, 6);
  }

  private refreshRelatedResultsForSelection(context?: SearchContext): void {
    if (!this.isSearchActive) {
      this.relatedResults = [];
      return;
    }

    const selected = this.selectedResult;
    if (!selected) {
      this.relatedResults = [];
      return;
    }

    this.relatedResults = this.getRelatedResults(selected, context ?? this.buildSearchContext(this.results, this.normalizeText(this.searchQuery)));
  }

  private getRelatedResults(selected: AddStopResult, context: SearchContext): AddStopResult[] {
    if (selected.lat == null || selected.lng == null) {
      return [];
    }

    const relatedPool = this.allItems
      .filter((item) => item.key !== selected.key)
      .filter((item) => this.matchesCategory(item))
      .filter((item) => item.lat != null && item.lng != null);

    const scopedPool = this.isLocationLike(selected)
      ? relatedPool.filter((item) => !this.isLocationLike(item) && this.matchesLocationContext(item, selected))
      : relatedPool.filter((item) =>
          context.locationCandidate ? this.matchesLocationContext(item, context.locationCandidate) : true,
        );

    const distanceCap = this.isLocationLike(selected) ? 30000 : 12000;

    return scopedPool
      .map((item) => ({
        item,
        score: this.scoreRelatedResult(item, selected, context),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item)
      .filter((item) => {
        if (this.matchesLocationContext(item, this.isLocationLike(selected) ? selected : (context.locationCandidate ?? selected))) {
          return true;
        }

        return this.calculateDistanceMeters(selected.lat!, selected.lng!, item.lat!, item.lng!) <= distanceCap;
      })
      .slice(0, 8);
  }

  private scoreRelatedResult(item: AddStopResult, selected: AddStopResult, context: SearchContext): number {
    if (item.lat == null || item.lng == null || selected.lat == null || selected.lng == null) {
      return 0;
    }

    const distanceScore = Math.max(0, 100000 - this.calculateDistanceMeters(selected.lat, selected.lng, item.lat, item.lng));
    let score = distanceScore / 1000;

    if (this.activeCategory && this.matchesCategory(item)) {
      score += 16;
    }

    if (item.category === selected.category) {
      score += 10;
    }

    if (this.normalizeText(item.subtitle).includes(this.normalizeText(selected.name))) {
      score += 12;
    }

    if (context.locationCandidate && this.matchesLocationContext(item, context.locationCandidate)) {
      score += 18;
    }

    if (context.intent && this.matchesSearchIntent(item, context.intent)) {
      score += 16;
    }

    return score;
  }

  private matchesLocationContext(item: AddStopResult, location: AddStopResult): boolean {
    const locationName = this.normalizeText(location.name);
    const haystack = this.describeItem(item);

    if (haystack.includes(locationName)) {
      return true;
    }

    if (item.lat != null && item.lng != null && location.lat != null && location.lng != null) {
      return this.calculateDistanceMeters(item.lat, item.lng, location.lat, location.lng) <= 30000;
    }

    return false;
  }

  private extractLocationTerms(query: string): string[] {
    const ignoredTerms = new Set([
      'zurka', 'party', 'night', 'club', 'klub', 'bar', 'izlazak',
      'restoran', 'kafana', 'kafic', 'cafe', 'coffee', 'hrana', 'pice', 'food', 'drink',
      'pumpa', 'gorivo', 'gas', 'fuel', 'petrol',
      'hotel', 'apartman', 'smestaj', 'hostel', 'villa', 'resort',
      'shop', 'shopping', 'market', 'prodavnica', 'trzni',
      'hospital', 'bolnica', 'apoteka', 'pharmacy', 'clinic', 'klinika',
    ]);

    return query
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
      .filter((token) => !ignoredTerms.has(token));
  }

  private describeItem(item: AddStopResult): string {
    return [
      item.name,
      item.subtitle,
      item.meta,
      item.typeName,
      item.markerType,
    ]
      .map((value) => this.normalizeText(value))
      .join(' ');
  }

  private isLocationLike(item: AddStopResult): boolean {
    return item.category === 'destination' || item.category === 'locality';
  }

  private detectSearchIntent(query: string): SearchIntent {
    if (/(zurka|party|night|club|klub|bar|izlazak)/.test(query)) return 'event';
    if (/(restoran|kafana|kafic|cafe|coffee|hrana|pice|food|drink)/.test(query)) return 'food';
    if (/(pumpa|gorivo|gas|fuel|petrol)/.test(query)) return 'fuel';
    if (/(hotel|apartman|smestaj|hostel|villa|resort)/.test(query)) return 'accommodation';
    if (/(shop|shopping|market|prodavnica|trzni)/.test(query)) return 'shopping';
    if (/(hospital|bolnica|apoteka|pharmacy|clinic|klinika)/.test(query)) return 'health';
    return null;
  }

  private matchesSearchIntent(item: AddStopResult, intent: SearchIntent): boolean {
    switch (intent) {
      case 'event':
        return item.category === 'event' || item.markerType === 'kafana';
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
        return false;
    }
  }

  private scoreSuggestedDistance(item: AddStopResult, anchor: RouteBuilderPoint | null): number {
    if (!anchor || item.lat == null || item.lng == null) {
      return Number.MAX_SAFE_INTEGER;
    }

    return this.calculateDistanceMeters(anchor.lat, anchor.lng, item.lat, item.lng);
  }

  private matchesCategory(item: AddStopResult): boolean {
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

  private readRecentHistory(): AddStopResult[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.recentStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => !!item?.key) : [];
    } catch {
      return [];
    }
  }

  private persistRecentHistory(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.recentStorageKey, JSON.stringify(this.recentHistory.slice(0, 8)));
  }

  private storeRecentItem(item: AddStopResult): void {
    const snapshot: AddStopResult = { ...item };
    this.recentHistory = [snapshot, ...this.recentHistory.filter((entry) => entry.key !== item.key)].slice(0, 8);
    this.persistRecentHistory();
  }

  private translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  private toDestinationResult(item: DestinationDto): AddStopResult {
    const destinationLabel = this.translate('map.addStop.resultTypes.destination');

    return {
      key: `destination:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.regionName || item.destinationTypeName || destinationLabel,
      meta: item.destinationTypeName || destinationLabel,
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'destination',
      markerType: 'destination',
      typeName: item.destinationTypeName || destinationLabel,
      raw: item,
    };
  }

  private toObjectResult(item: ObjectDto): AddStopResult {
    const markerType = this.getObjectType(item.objectTypeName || '');
    const objectLabel = this.translate('map.addStop.resultTypes.object');

    return {
      key: `object:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.address || item.localityName || item.destinationName || objectLabel,
      meta: item.objectTypeName || objectLabel,
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'object',
      markerType,
      typeName: item.objectTypeName || objectLabel,
      raw: item,
    };
  }

  private toEventResult(item: EventDto): AddStopResult {
    const eventLabel = this.translate('map.addStop.resultTypes.event');

    return {
      key: `event:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.localityName || item.destinationName || eventLabel,
      meta: item.eventTypeName || eventLabel,
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'event',
      markerType: 'event',
      typeName: item.eventTypeName || eventLabel,
      raw: item,
    };
  }

  private toActivityResult(item: ActivityDto): AddStopResult {
    const activityLabel = this.translate('map.addStop.resultTypes.activity');

    return {
      key: `activity:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.localityName || item.destinationName || activityLabel,
      meta: item.activityTypeName || activityLabel,
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'activity',
      markerType: 'activity',
      typeName: item.activityTypeName || activityLabel,
      raw: item,
    };
  }

  private toLocalityResult(item: LocalityDto): AddStopResult {
    const localityLabel = this.translate('map.addStop.resultTypes.locality');

    return {
      key: `locality:${item.id}`,
      id: item.id,
      name: item.name,
      subtitle: item.destinationName || item.regionName || localityLabel,
      meta: item.localityTypeName || localityLabel,
      image: this.resolveMediaUrl(item.mainImageUrl || item.images?.[0]?.url || ''),
      lat: item.latitude,
      lng: item.longitude,
      category: 'locality',
      markerType: 'locality',
      typeName: item.localityTypeName || localityLabel,
      raw: item,
    };
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
      `&layer=mapnik`;
  
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private syncAddStopPageState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('route-add-stop-open', isOpen);
    document.body.classList.toggle('route-add-stop-open', isOpen);
  }

  private async navigateBackToMap(extras?: NavigationExtras): Promise<boolean> {
    this.dismissActiveInput();
    this.syncAddStopPageState(false);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    return this.router.navigate(['/map'], extras);
  }

  private dismissActiveInput(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }
}
