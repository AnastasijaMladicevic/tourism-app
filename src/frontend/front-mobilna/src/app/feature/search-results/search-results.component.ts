import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subscription, catchError, forkJoin, of, tap } from 'rxjs';
import { ActivityDto, ActivityService } from '../../services/activity';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import { LocalityDto, LocalityService } from '../../services/locality';
import { ObjectDto, ObjectService } from '../../services/object';
import { SmartSearchResultDto } from '../../services/smart-search';
import { environment } from '../../../environment/environment';
import { DataCacheService } from '../../services/data-cache';

const SEARCH_STOP_WORDS = new Set([
  'gde', 'mogu', 'moze', 'mozete', 'da', 'na', 'sa', 'u', 'uz', 'za', 'od', 'do', 'i', 'ili',
  'nije', 'nisu', 'je', 'su', 'koji', 'koja', 'koje', 'mnogo', 'malo', 'malom', 'mala', 'male',
  'mali', 'skupa', 'skupo', 'skup', 'skupu', 'hrana', 'hranu', 'jel', 'ima', 'imas', 'neki',
  'neka', 'bas', 'predlog', 'molim', 'te', 'mi',
]);

type SearchSource = 'home' | 'map' | 'default';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  searchQuery = '';
  results: SmartSearchResultDto[] = [];
  activeTypeFilters = new Set<string>();
  answer = '';
  warning: string | null = null;
  isLoading = false;
  hasSearched = false;
  source: SearchSource = 'default';

  get availableTypes(): string[] {
    const seen = new Set<string>();
    const types: string[] = [];
    for (const r of this.results) {
      const t = r.typeName?.trim();
      if (t && !seen.has(t)) { seen.add(t); types.push(t); }
    }
    return types.sort((a, b) => a.localeCompare(b));
  }

  get displayedResults(): SmartSearchResultDto[] {
    if (!this.activeTypeFilters.size) return this.results;
    return this.results.filter(r => this.activeTypeFilters.has(r.typeName?.trim() ?? ''));
  }

  toggleTypeFilter(type: string): void {
    if (this.activeTypeFilters.has(type)) {
      this.activeTypeFilters.delete(type);
    } else {
      this.activeTypeFilters.add(type);
    }
    this.activeTypeFilters = new Set(this.activeTypeFilters);
  }

  private readonly subscriptions = new Subscription();
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destinationService: DestinationService,
    private readonly objectService: ObjectService,
    private readonly eventService: EventService,
    private readonly activityService: ActivityService,
    private readonly localityService: LocalityService,
    private readonly dataCache: DataCacheService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const query = (params.get('q') ?? '').trim();
        const source = params.get('source');
        this.source = source === 'home' || source === 'map' ? source : 'default';
        this.searchQuery = query;

        if (!query) {
          this.results = [];
          this.answer = '';
          this.warning = null;
          this.hasSearched = false;
          this.isLoading = false;
          return;
        }

        this.runSearch(query, this.source);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.submitSearch();
    }, 260);
  }

  submitSearch(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.clearSearch();
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query, source: this.source === 'default' ? null : this.source },
      queryParamsHandling: 'merge',
    });
  }

  clearSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    this.searchQuery = '';
    this.results = [];
    this.answer = '';
    this.warning = null;
    this.hasSearched = false;
    this.isLoading = false;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  openResult(result: SmartSearchResultDto): void {
    switch (result.category) {
      case 'destination':
      case 'locality':
      case 'activity':
        this.router.navigate(['/map'], {
          state: {
            lat: result.latitude,
            lng: result.longitude,
            zoom: 14,
            selectedItem: { id: result.id },
            selectedType: result.category,
          },
        });
        break;
      case 'object':
        this.router.navigate(['/object', result.id]);
        break;
      case 'event':
        this.router.navigate(['/event', result.id]);
        break;
    }
  }

  goBack(): void {
    window.history.back();
  }

  private runSearch(query: string, source: SearchSource): void {
    this.isLoading = true;
    this.hasSearched = true;
    this.activeTypeFilters = new Set();
    this.runKeywordSearch(query, source);
  }

  private cachedList<T>(key: string, fetch$: Observable<T[]>): Observable<T[]> {
    const cached = this.dataCache.get<T[]>(key);
    if (cached !== null) return of(cached);
    return fetch$.pipe(
      tap(data => this.dataCache.set(key, data, 10 * 60 * 1000)),
      catchError(() => of([] as T[])),
    );
  }

  private runKeywordSearch(query: string, source: SearchSource): void {
    this.answer = '';
    this.warning = null;

    forkJoin({
      destinations: this.cachedList<DestinationDto>('sr:dest', this.destinationService
        .getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true, bypassLanguage: true })),
      objects: this.cachedList<ObjectDto>('sr:obj', this.objectService
        .getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true, bypassLanguage: true })),
      events: this.cachedList<EventDto>('sr:evt', this.eventService
        .getAll({ page: 1, pageSize: 500, sortBy: 'startDate', sortOrder: 'asc' }, { bypassRegion: true, bypassLanguage: true })),
      activities: this.cachedList<ActivityDto>('sr:act', this.activityService
        .getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })),
      localities: this.cachedList<LocalityDto>('sr:loc', this.localityService
        .getAll({ page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })),
    }).subscribe(({ destinations, objects, events, activities, localities }) => {
      if (this.searchQuery.trim() !== query || this.source !== source) {
        return;
      }

      const allItems: SmartSearchResultDto[] = [
        ...this.toArray<DestinationDto>(destinations).map((destination) =>
          this.toSearchResult(destination, 'destination', 'destination'),
        ),
        ...this.toArray<ObjectDto>(objects).map((obj) =>
          this.toSearchResult(obj, this.getObjectType(obj.objectTypeName || ''), 'object'),
        ),
        ...this.toArray<EventDto>(events).map((event) => this.toSearchResult(event, 'event', 'event')),
        ...this.toArray<ActivityDto>(activities).map((activity) =>
          this.toSearchResult(activity, 'activity', 'activity'),
        ),
        ...this.toArray<LocalityDto>(localities).map((locality) =>
          this.toSearchResult(locality, 'locality', 'locality'),
        ),
      ];

      const terms = this.tokenizeSearchQuery(query);
      const results = allItems
        .map((item) => ({ item, score: this.scoreItem(item, terms) }))
        .filter((entry) => this.matchesAllTerms(entry.item, terms))
        .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
        .slice(0, 40)
        .map((entry) => entry.item);

      this.results = results;
      this.isLoading = false;
    });
  }

  private matchesAllTerms(item: SmartSearchResultDto, terms: string[]): boolean {
    if (!terms.length) {
      return true;
    }

    const haystacks = [
      item.name,
      item.typeName,
      item.location,
      item.matchReason,
      this.getSearchableText(item),
    ]
      .filter(Boolean)
      .map((value) => this.normalizeForSearch(value));

    return terms.every((term) => haystacks.some((value) => value.includes(term)));
  }

  private scoreItem(item: SmartSearchResultDto, terms: string[]): number {
    if (!terms.length) {
      return 0;
    }

    const name = this.normalizeForSearch(item.name);
    const typeName = this.normalizeForSearch(item.typeName);
    const location = this.normalizeForSearch(item.location);
    const searchable = this.normalizeForSearch(this.getSearchableText(item));

    let score = 0;
    for (const term of terms) {
      if (name.includes(term)) score += 4;
      if (typeName.includes(term)) score += 2.5;
      if (location.includes(term)) score += 1.5;
      if (searchable.includes(term)) score += 1;
    }

    return score;
  }

  private tokenizeSearchQuery(query: string): string[] {
    const normalized = this.normalizeForSearch(query);
    const tokens = normalized
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));

    if (tokens.length > 0) {
      return tokens;
    }

    return normalized.length >= 2 ? [normalized] : [];
  }

  private normalizeForSearch(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private getSearchableText(item: SmartSearchResultDto): string {
    const raw = item as unknown as { raw?: Record<string, unknown> };
    const source = raw.raw ?? {};
    const listText = Array.isArray(source['amenities']) ? source['amenities'].join(' ') : '';
    const description = String(source['description'] ?? '');
    const cuisineType = String(source['cuisineType'] ?? '');
    const objectTypeName = String(source['objectTypeName'] ?? '');
    const eventTypeName = String(source['eventTypeName'] ?? '');
    const destinationTypeName = String(source['destinationTypeName'] ?? '');
    const activityTypeName = String(source['activityTypeName'] ?? '');
    const localityTypeName = String(source['localityTypeName'] ?? '');

    return [
      description,
      listText,
      cuisineType,
      objectTypeName,
      eventTypeName,
      destinationTypeName,
      activityTypeName,
      localityTypeName,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private toSearchResult(
    raw: any,
    markerType: string,
    category: SmartSearchResultDto['category'],
  ): SmartSearchResultDto {
    const iconMap: Record<string, string> = {
      destination: 'place',
      hotel: 'hotel',
      apartment: 'apartment',
      restaurant: 'restaurant',
      kafana: 'local_bar',
      gas_station: 'local_gas_station',
      shop: 'shopping_bag',
      mall: 'shopping_bag',
      market: 'storefront',
      hospital: 'local_hospital',
      clinic: 'local_hospital',
      pharmacy: 'medication',
      activity: 'directions_walk',
      event: 'event',
      locality: 'location_city',
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
        markerType,
      location: raw.localityName ?? raw.destinationName ?? raw.regionName ?? '',
      category,
      markerType,
      icon: iconMap[markerType] ?? iconMap['default'],
      imageUrl: this.resolveMediaUrl(raw.mainImageUrl ?? raw.images?.[0]?.url ?? ''),
      latitude: raw.latitude,
      longitude: raw.longitude,
      matchReason: 'Keyword match',
      score: 0,
      raw,
    } as SmartSearchResultDto;
  }

  private toArray<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj['items'])) return obj['items'] as T[];
    if (Array.isArray(obj['data'])) return obj['data'] as T[];
    if (Array.isArray(obj['results'])) return obj['results'] as T[];
    if (Array.isArray(obj['value'])) return obj['value'] as T[];
    return [];
  }

  private getObjectType(name: string): string {
    const normalized = this.normalizeForSearch(name);

    if (
      normalized.includes('hotel') ||
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
      normalized.includes('bar') ||
      normalized.includes('club') ||
      normalized.includes('klub') ||
      normalized.includes('kafana') ||
      normalized.includes('vinarija')
    ) {
      return 'kafana';
    }

    if (
      normalized.includes('restaurant') ||
      normalized.includes('restoran') ||
      normalized.includes('kafic') ||
      normalized.includes('kafe')
    ) {
      return 'restaurant';
    }

    if (normalized.includes('pumpa') || normalized.includes('gas') || normalized.includes('fuel')) {
      return 'gas_station';
    }

    if (normalized.includes('apoteka') || normalized.includes('pharmacy')) {
      return 'pharmacy';
    }

    if (normalized.includes('bolnica') || normalized.includes('hospital') || normalized.includes('clinic')) {
      return 'hospital';
    }

    if (
      normalized.includes('shop') ||
      normalized.includes('store') ||
      normalized.includes('market') ||
      normalized.includes('mall')
    ) {
      return normalized.includes('mall') ? 'mall' : 'shop';
    }

    return 'destination';
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    return trimmed.startsWith('/') ? `${apiBase}${trimmed}` : `${apiBase}/${trimmed}`;
  }
}
