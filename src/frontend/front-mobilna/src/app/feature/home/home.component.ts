import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, Observable, of } from 'rxjs';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import { ActivityDto, ActivityService } from '../../services/activity';
import { CreateFavoriteDto, FavoriteDto, FavoriteService } from '../../services/favorite';
import { ImageDto } from '../../services/image';
import { environment } from '../../../environment/environment';
import { AuthService } from '../../services/auth';
import { ObjectDto, ObjectService } from '../../services/object';
import { MatIcon } from "@angular/material/icon";
import { LazyBackgroundDirective } from '../../shared/directives/lazy-background.directive';
import { RecommendationItemDto, RecommendationService } from '../../services/recommendation';
import { LocationTrackingService } from '../../services/location-tracking';
import { SmartSearchResultDto, SmartSearchService } from '../../services/smart-search';

interface PlaceCard {
  title: string;
  location: string;
  ratingText: string;
  imageUrl?: string;
  isFavorite: boolean;
  itemId: number;
  itemType: 'destination' | 'object' | 'activity';
  targetUrl: string;
  favoriteId?: number;
  showRating: boolean;
}

interface EventCard {
  id: number;
  title: string;
  location: string;
  dateText: string;
  priceText: string;
  isFree: boolean;
  timeText: string;
  imageUrl?: string;
}

interface FeaturedDestination {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  displayTitle?: string;
}

interface ApiTranslationDto {
  id: number;
  entityType: string;
  entityId: number;
  fieldName: string;
  languageCode: string;
  translatedText: string;
  isAutoTranslated: boolean;
}

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
  category: 'destination' | 'locality' | 'object' | 'event' | 'activity';
  markerType: string;
}
interface HomeCategory {
  label: string;
  route: string;
  key: 'object' | 'locality' | 'event' | 'activity' | 'destination'
}

const SEARCH_STOP_WORDS = new Set([
  'gde', 'mogu', 'moze', 'da', 'na', 'sa', 'u', 'uz', 'za', 'od', 'do', 'i', 'ili',
  'nije', 'nisu', 'je', 'su', 'koji', 'koja', 'koje', 'mnogo', 'malo', 'malom',
  'mala', 'male', 'mali', 'skupa', 'skupo', 'skup', 'skupu', 'hrana', 'hranu',
]);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BottomNavComponent, FormsModule, MatIcon, LazyBackgroundDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  userName = '';
  searchQuery = '';
  readonly categories: HomeCategory[] = [
    { label: 'Destinations', route: '/destinations', key: 'destination' },
    { label: 'Objects', route: '/objects', key: 'object' },
    { label: 'Localities', route: '/localities', key: 'locality' },
    { label: 'Activities', route: '/activities', key: 'activity' },
    { label: 'Events', route: '/events', key: 'event' },
  ];
  featuredDestinations: FeaturedDestination[] = [];
  currentFeatured: FeaturedDestination | null = null;
  recommended: PlaceCard[] = [];
  popular: PlaceCard[] = [];
  events: any[] = [];
  upcomingEvents: EventCard[] = [];
  searchResults: SearchResult[] = [];
  private allItems: SearchResult[] = [];
  rotationInterval: any;
  currentIndex = 0;
  showSuggestions = false;
  isLoadingPlaces = true;
  isLoadingEvents = true;
  isLoadingRecommendations = true;

  private favoriteMap = new Map<string, number>();
  private fallbackRecommended: PlaceCard[] = [];
  private hasRecommendationResponse = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private activityService: ActivityService,
    private favoriteService: FavoriteService,
    private eventService: EventService,
    private authService: AuthService,
    private recommendationService: RecommendationService,
    private locationTrackingService: LocationTrackingService,
    private smartSearchService: SmartSearchService,
  ) { }
  onSearchInput(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.searchResults = [];
      this.showSuggestions = false;
      return;
    }

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      const currentLocation = this.locationTrackingService.getCurrentLocation();
      const includeLocation =
        this.locationTrackingService.isTrackingEnabled() && currentLocation != null;

      this.smartSearchService
        .searchMcp({
          query,
          pageSize: 8,
          latitude: includeLocation ? currentLocation?.latitude : undefined,
          longitude: includeLocation ? currentLocation?.longitude : undefined,
        })
        .pipe(catchError(() => of([] as SmartSearchResultDto[])))
        .subscribe((results) => {
          if (this.searchQuery.trim() !== query) {
            return;
          }

          const mapped = results.map((result) => this.toSmartSearchResult(result));
          if (mapped.length > 0) {
            this.searchResults = mapped;
            this.showSuggestions = true;
          } else {
            this.searchResults = [];
            this.showSuggestions = false;
          }

          this.cdr.detectChanges();
        });
    }, 260);
  }
  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }
  private matchesAllTerms(item: SearchResult, terms: string[]): boolean {
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();
    const amenities = this.getAmenityText(item).toLowerCase();

    return terms.every(
      (term) => name.includes(term) || desc.includes(term) || amenities.includes(term),
    );
  }
  clearSearch(): void {
    this.searchQuery = '';
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.searchResults = [];
    this.showSuggestions = false;
  }

  submitSearch(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      return;
    }

    this.showSuggestions = false;
    this.router.navigate(['/search'], {
      queryParams: { q: query, source: 'home' },
    });
  }
  private scoreItem(item: SearchResult, terms: string[]): number {
    let score = 0;
    const name = item.name.toLowerCase();
    const desc = (item.raw.description ?? '').toLowerCase();
    const amenities = this.getAmenityText(item).toLowerCase();

    for (const term of terms) {
      if (name.includes(term)) score += 3;
      if (desc.includes(term)) score += 1;
      if (amenities.includes(term)) score += 0.5;
    }
    return score;
  }

  private applyFallbackSearch(query: string): void {
    const terms = this.tokenizeSearchQuery(query);
    const scored = this.allItems
      .map((item) => ({
        item,
        score: this.scoreItem(item, terms),
      }))
      .filter((x) => this.matchesAllTerms(x.item, terms))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    this.searchResults = scored.map((x) => x.item);
    this.showSuggestions = this.searchResults.length > 0;
  }

  private tokenizeSearchQuery(query: string): string[] {
    return query
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));
  }

  private toSmartSearchResult(result: SmartSearchResultDto): SearchResult {
    return {
      id: result.id,
      name: result.name,
      typeName: result.typeName,
      location: result.location,
      image: this.resolveMediaUrl(result.imageUrl),
      icon: result.icon || this.getCategoryIcon(result.category),
      lat: result.latitude,
      lng: result.longitude,
      raw: {
        matchReason: result.matchReason,
        score: result.score,
      },
      category: result.category,
      markerType: result.markerType,
    };
  }
  private getAmenityText(item: SearchResult): string {
    const rawAmenities = Array.isArray(item.raw?.amenities)
      ? item.raw.amenities.join(' ')
      : '';
    const rawCuisine = item.raw?.cuisineType ?? '';
    const rawType = item.raw?.objectTypeName ?? item.raw?.eventTypeName ?? item.raw?.destinationTypeName ?? '';
    const rawDescription = item.raw?.description ?? '';

    const realText = `${rawAmenities} ${rawCuisine} ${rawType} ${rawDescription}`.trim();
    return realText;
  }
  nextFeatured(): void {
    if (!this.featuredDestinations.length) return;

    this.currentIndex =
      (this.currentIndex + 1) % this.featuredDestinations.length;

    this.currentFeatured =
      this.featuredDestinations[this.currentIndex];
  }

  prevFeatured(): void {
    if (!this.featuredDestinations.length) return;

    this.currentIndex =
      (this.currentIndex - 1 + this.featuredDestinations.length) %
      this.featuredDestinations.length;

    this.currentFeatured =
      this.featuredDestinations[this.currentIndex];
  }
  goToFeatured(index: number): void {
    this.currentIndex = index;
    this.currentFeatured = this.featuredDestinations[index];
  }
  ngOnInit(): void {
    this.loadUserName();
    this.loadPlaceCards();
    this.loadRecommendedCards();
    this.loadEventCards();
    this.loadFavorites();
  }
  ngOnDestroy(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }
  selectSuggestion(result: SearchResult): void {
    this.searchQuery = result.name;
    this.showSuggestions = false;
    this.openSearchResult(result);
  }

  private openSearchResult(result: SearchResult): void {
    switch (result.category) {
      case 'destination':
      case 'locality':
      case 'activity':
        this.router.navigate(['/map'], {
          state: {
            lat: result.lat,
            lng: result.lng,
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
  loadEvents(): void {
    this.eventService.getAll().subscribe({
      next: (res) => {
        const list = this.toArray<any>(res);

        this.events = list.map(e => ({
          id: e.id,
          title: e.name,
          location: e.localityName ?? e.destinationName ?? e.regionName ?? '',
          imageUrl: e.mainImageUrl ?? e.images?.[0]?.url ?? '',
          dateText: e.date ?? '',
          timeText: this.eventTime(e.startDate, e.endDate),
          priceText: e.price ? `${e.price}€` : 'Free',
          isFree: !e.price
        }));
      },
      error: err => console.error('Events error:', err)
    });
  }
  loadFeatured(): void {
    this.destinationService
      .getAll({ page: 1, pageSize: 24, sortBy: 'name', sortOrder: 'asc' })
      .pipe(catchError(() => of([] as unknown[])))
      .subscribe((data) => {
        const featured = this.toArray<DestinationDto>(data)
          .map((destination) => this.normalizeDestination(destination))
          .filter((destination) => destination.id > 0 && destination.isActive !== false)
          .map((destination) => this.toFeaturedDestination(destination))
          .filter((destination) => !!destination.imageUrl);

        if (!featured.length) {
          this.featuredDestinations = [];
          this.currentFeatured = null;
          return;
        }

        const shuffled = [...featured].sort(() => Math.random() - 0.5);

        this.featuredDestinations = shuffled.slice(0, Math.min(5, shuffled.length));
        this.translateFeaturedDisplayTitles(this.featuredDestinations).pipe().subscribe((res) => {
          this.featuredDestinations = res;
        });
        this.currentIndex = 0;
        this.currentFeatured = this.featuredDestinations[0];
        
        this.startRotation();
        this.flushUi();
      });
  }
  startRotation(): void {
    if (!this.featuredDestinations.length) return;

    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }

    this.rotationInterval = setInterval(() => {
      this.currentIndex =
        (this.currentIndex + 1) % this.featuredDestinations.length;

      this.currentFeatured =
        this.featuredDestinations[this.currentIndex];
      this.cdr.detectChanges();
    }, 10000);
  }

  get isLoadingHome(): boolean {
    return this.isLoadingPlaces || this.isLoadingEvents || this.isLoadingRecommendations;
  }

  private get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  private loadUserName(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return;
    }

    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (fullName) this.userName = fullName;
  }

  private loadPlaceCards(): void {
    this.isLoadingPlaces = true;

    const lang = (localStorage.getItem('appLanguage') || 'sr').trim().toLowerCase();

    forkJoin({
      destinations: this.destinationService
        .getAll({ page: 1, pageSize: 8, sortBy: 'name', sortOrder: 'asc', lang })
        .pipe(catchError(() => of([] as unknown[]))),
      objects: this.objectService
        .getAll(
          { page: 1, pageSize: 8, sortBy: 'name', sortOrder: 'asc' },
          { bypassLanguage: true },
        )
        .pipe(catchError(() => of([] as unknown[]))),
      activities: this.activityService
        .getAll(
          { page: 1, pageSize: 8, sortBy: 'name', sortOrder: 'asc' },
          { bypassLanguage: true },
        )
        .pipe(catchError(() => of([] as unknown[]))),
    })
      .pipe(
        finalize(() => {
          this.isLoadingPlaces = false;
          this.flushUi();
        }),
      )
      .subscribe(({ destinations, objects, activities }) => {
        const destinationCards = this.toArray<DestinationDto>(destinations)
          .map((d) => this.normalizeDestination(d))
          .filter((d) => d.id > 0 && d.isActive !== false)
          .map((d) => this.toDestinationCard(d));

        const featured = this.toArray<DestinationDto>(destinations)
          .map((destination) => this.normalizeDestination(destination))
          .filter((destination) => destination.id > 0 && destination.isActive !== false)
          .map((destination) => this.toFeaturedDestination(destination))
          .filter((destination) => !!destination.imageUrl);

        const objectCards = this.toArray<ObjectDto>(objects)
          .map((o) => this.normalizeObject(o))
          .filter((o) => o.id > 0 && o.isActive !== false)
          .filter((o) => {
            const type = o.objectTypeName?.trim().toLowerCase();
            return type === 'restoran' || type === 'kafic';
          })
          .map((o) => this.toObjectCard(o));

        const activityCards = this.toArray<ActivityDto>(activities)
          .map((a) => this.normalizeActivity(a))
          .filter((a) => a.id > 0 && a.isActive !== false)
          .map((a) => this.toActivityCard(a));

        this.fallbackRecommended = this.mixRecommendedCards(destinationCards, activityCards, objectCards);
        if (!this.hasRecommendationResponse || !this.recommended.length) {
          this.recommended = [...this.fallbackRecommended];
          this.applyFavoriteState(this.recommended);
        }
        this.popular = destinationCards;

        if (featured.length) {
          const shuffled = [...featured].sort(() => Math.random() - 0.5);
          const selectedFeatured = shuffled.slice(0, Math.min(5, shuffled.length));
          this.featuredDestinations = selectedFeatured;
          this.translateFeaturedDisplayTitles(this.featuredDestinations).pipe().subscribe((res) => {
            this.featuredDestinations = res;
          });
          this.currentIndex = 0;
          this.translateFeaturedDisplayTitles(selectedFeatured).subscribe((res) => {
          this.featuredDestinations = res;
          this.currentFeatured = this.featuredDestinations[0];
          this.startRotation();
          this.flushUi();
        });
          this.flushUi();
        } else {
          this.featuredDestinations = [];
          this.currentFeatured = null;
        }

        this.flushUi();
        this.allItems = [
          ...this.toArray<DestinationDto>(destinations).map(d => this.normalizeDestination(d)).map(d => ({
            id: d.id, name: d.name, typeName: d.destinationTypeName,
            location: d.regionName ?? d.destinationTypeName ?? '', image: d.mainImageUrl, icon: 'place',
            raw: d, category: 'destination' as const, markerType: 'destination'
          })),
          ...this.toArray<ObjectDto>(objects).map(o => this.normalizeObject(o)).map(o => ({
            id: o.id, name: o.name, typeName: o.objectTypeName,
            location: o.localityName ?? '', image: o.mainImageUrl, icon: 'apartment',
            raw: o, category: 'object' as const, markerType: o.objectTypeName?.toLowerCase().includes('hotel') ? 'hotel' : 'restaurant'
          })),
        ];
      });
  }

  private translateFeaturedDisplayTitles(
    featured: FeaturedDestination[]
  ): Observable<FeaturedDestination[]> {
    const lang = (localStorage.getItem('appLanguage') || 'sr')
      .trim()
      .toLowerCase();

  if (!featured.length || lang === 'sr' || lang === 'me') {
    return of(featured);
  }

  return forkJoin(
    featured.map((item) => {

      return this.http
      .get<ApiTranslationDto[]>(
        `${environment.apiUrl}/translations?entityType=Destination&entityId=${item.id}`
      )
      .pipe(
        map((translations) => {
          const translatedDescription = translations
            .find(
              (translation) =>
                translation.fieldName?.toLowerCase() === 'displayTitle' &&
                translation.languageCode?.toLowerCase() === lang
            )
            ?.translatedText?.trim();

          return translatedDescription
            ? {
                ...item,
                displayTitle: translatedDescription,
              }
            : item;
        }),
          catchError((error) => {
            console.error(
              `Greška pri prevodu featured destination ${item.id}:`,
              error
            );

            return of(item);
          })
        );
    })
  );
}

  private loadRecommendedCards(): void {
    this.isLoadingRecommendations = true;

    const currentLocation = this.locationTrackingService.getCurrentLocation();
    const canUseLocation = this.shouldShowLiveDistance();

    this.recommendationService
      .getHomeRecommendations({
        pageSize: 12,
        latitude: canUseLocation ? currentLocation?.latitude : undefined,
        longitude: canUseLocation ? currentLocation?.longitude : undefined,
      })
      .pipe(
        catchError(() => of([] as RecommendationItemDto[])),
        finalize(() => {
          this.isLoadingRecommendations = false;
          this.flushUi();
        }),
      )
      .subscribe((items) => {
        this.hasRecommendationResponse = true;

        const cards = items
          .map((item) => this.toRecommendationCard(item))
          .filter((card): card is PlaceCard => !!card);

        this.recommended = cards.length ? cards : [...this.fallbackRecommended];
        this.applyFavoriteState(this.recommended);
        this.flushUi();
      });
  }

  private loadEventCards(): void {
    this.isLoadingEvents = true;

    this.eventService
      .getAll(
        { page: 1, pageSize: 12, sortBy: 'startDate', sortOrder: 'asc' },
        { bypassLanguage: true },
      )
      .pipe(
        catchError(() => of([] as unknown[])),
        finalize(() => {
          this.isLoadingEvents = false;
          this.flushUi();
        }),
      )
      .subscribe((events) => {
        const eventList = this.toArray<EventDto>(events);

        const future = eventList
          .map((e) => this.normalizeEvent(e))
          .filter((e) => e.id > 0 && e.isActive !== false && new Date(e.startDate) >= new Date())
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        const eventCards = future.slice(0, 8).map(
          (e): EventCard => ({
            id: e.id,
            title: e.name,
            location: e.localityName ?? e.destinationName ?? e.regionName ?? '',
            dateText: this.eventDate(e.startDate),
            priceText: this.eventPrice(e.price),
            isFree: !e.price || e.price <= 0,
            timeText: this.eventTime(e.startDate, e.endDate),
            imageUrl: this.pickEventImage(e),
          }),
        );

        this.upcomingEvents = eventCards;
        this.events = eventCards;

        const mappedEvents = future.map((e) => ({
          id: e.id,
          name: e.name,
          typeName: 'Event',
          location: e.localityName ?? e.destinationName ?? e.regionName ?? '',
          image: this.pickEventImage(e),
          icon: 'event',
          raw: e,
          category: 'event' as const,
          markerType: 'event',
        }));

        this.allItems = [
          ...this.allItems.filter((item) => item.category !== 'event'),
          ...mappedEvents,
        ];

        this.flushUi();
      });
  }

  private loadFavorites(): void {
    if (!this.isLoggedIn) {
      return;
    }

    this.favoriteService
      .getMyFavorites()
      .pipe(catchError(() => of([] as FavoriteDto[])))
      .subscribe((favorites) => {
        this.favoriteMap = new Map<string, number>();

        for (const favorite of favorites) {
          const raw = favorite as unknown as Record<string, unknown>;
          const favoriteId = Number(raw['id'] ?? raw['Id'] ?? 0);
          if (!favoriteId) continue;

          const destinationId = Number(raw['destinationId'] ?? raw['DestinationId'] ?? 0);
          const objectId = Number(raw['objectId'] ?? raw['ObjectId'] ?? 0);
          const activityId = Number(raw['activityId'] ?? raw['ActivityId'] ?? 0);

          if (destinationId) this.favoriteMap.set(this.favoriteKey('destination', destinationId), favoriteId);
          if (objectId) this.favoriteMap.set(this.favoriteKey('object', objectId), favoriteId);
          if (activityId) this.favoriteMap.set(this.favoriteKey('activity', activityId), favoriteId);
        }

        this.applyFavoriteState(this.recommended);
        this.applyFavoriteState(this.popular);
        this.flushUi();
      });
  }

  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const listKeys = ['items', 'data', 'results', 'value'];
    for (const key of listKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }
    return [];
  }

  private normalizeDestination(raw: DestinationDto): {
    id: number;
    name: string;
    displayTitle?: string;
    description?: string;
    destinationTypeName: string;
    regionName?: string;
    isActive: boolean;
    averageRating?: number;
    reviewCount?: number;
    mainImageUrl?: string;
    images?: unknown[];
  } {
    const dto = raw as unknown as Record<string, unknown>;
    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      displayTitle: (dto['displayTitle'] ?? dto['DisplayTitle'] ?? undefined) as string | undefined,
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      destinationTypeName: String(dto['destinationTypeName'] ?? dto['DestinationTypeName'] ?? ''),
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? undefined) as string | undefined,
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      mainImageUrl: this.readString(dto, ['mainImageUrl', 'MainImageUrl']),
      images: (dto['images'] ?? dto['Images']) as unknown[] | undefined,
    };
  }

  private normalizeObject(raw: ObjectDto): {
    id: number;
    name: string;
    description?: string;
    objectTypeName: string;
    localityName?: string;
    destinationName?: string;
    regionName?: string;
    averageRating?: number;
    reviewCount?: number;
    isActive: boolean;
    mainImageUrl?: string;
    images?: unknown[];
  } {
    const dto = raw as unknown as Record<string, unknown>;
    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      objectTypeName: String(dto['objectTypeName'] ?? dto['ObjectTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName:
        (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? undefined) as string | undefined,
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      mainImageUrl: this.readString(dto, ['mainImageUrl', 'MainImageUrl']),
      images: (dto['images'] ?? dto['Images']) as unknown[] | undefined,
    };
  }

  private normalizeActivity(raw: ActivityDto): {
    id: number;
    name: string;
    activityTypeName: string;
    localityName?: string;
    destinationName?: string;
    regionName?: string;
    price?: number;
    durationMinutes?: number;
    isActive: boolean;
    mainImageUrl?: string;
  } {
    const dto = raw as unknown as Record<string, unknown>;
    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      activityTypeName: String(dto['activityTypeName'] ?? dto['ActivityTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName:
        (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? undefined) as string | undefined,
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      durationMinutes: this.readOptionalNumber(dto, ['durationMinutes', 'DurationMinutes']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      mainImageUrl: this.readString(dto, ['mainImageUrl', 'MainImageUrl']),
    };
  }

  private normalizeEvent(raw: EventDto): {
    id: number;
    name: string;
    startDate: string;
    endDate?: string | null;
    price?: number | null;
    isActive: boolean;
    localityName?: string | null;
    destinationName?: string | null;
    regionName?: string | null;
    mainImageUrl?: string;
    images?: unknown[];
  } {
    const dto = raw as unknown as Record<string, unknown>;
    const startDate = dto['startDate'] ?? dto['StartDate'];
    const endDate = dto['endDate'] ?? dto['EndDate'];
    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      startDate:
        typeof startDate === 'string'
          ? startDate
          : new Date(startDate as string | number | Date).toISOString(),
      endDate:
        typeof endDate === 'string' || endDate == null
          ? (endDate as string | null | undefined)
          : new Date(endDate as string | number | Date).toISOString(),
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? null) as string | null,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? null) as string | null,
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? null) as string | null,
      mainImageUrl: this.readString(dto, ['mainImageUrl', 'MainImageUrl']),
      images: (dto['images'] ?? dto['Images']) as unknown[] | undefined,
    };
  }

  private toDestinationCard(destination: ReturnType<HomeComponent['normalizeDestination']>): PlaceCard {
    const card: PlaceCard = {
      title: destination.name,
      location: destination.regionName ?? destination.destinationTypeName,
      imageUrl: this.pickDestinationImage(destination),
      isFavorite: false,
      itemId: destination.id,
      itemType: 'destination',
      targetUrl: '/destinations',
      showRating: false,
      ratingText: ""
    };

    this.applyFavoriteState([card]);
    return card;
  }

  private toFeaturedDestination(
    destination: ReturnType<HomeComponent['normalizeDestination']>,
  ): FeaturedDestination {
    return {
      id: destination.id,
      name: destination.name,
      displayTitle:
        destination.displayTitle?.trim() ||
        destination.description?.trim() ||
        destination.destinationTypeName,
      description: destination.description,
      imageUrl: this.pickDestinationImage(destination),
    };
  }

  private toObjectCard(object: ReturnType<HomeComponent['normalizeObject']>): PlaceCard {
    const card: PlaceCard = {
      title: object.name,
      location: object.localityName ?? object.destinationName ?? object.objectTypeName,
      ratingText: this.ratingText(object),
      imageUrl: this.pickObjectImage(object),
      isFavorite: false,
      itemId: object.id,
      itemType: 'object',
      targetUrl: `/object/${object.id}`,
      showRating: (object.averageRating ?? 0) > 0,
    };

    this.applyFavoriteState([card]);
    return card;
  }

  private toActivityCard(activity: ReturnType<HomeComponent['normalizeActivity']>): PlaceCard {
    const card: PlaceCard = {
      title: activity.name,
      location:
        activity.localityName ??
        activity.destinationName ??
        activity.regionName ??
        activity.activityTypeName,
      ratingText: this.activityMetaText(activity),
      imageUrl: this.resolveMediaUrl(activity.mainImageUrl),
      isFavorite: false,
      itemId: activity.id,
      itemType: 'activity',
      targetUrl: '/map',
      showRating: false,
    };

    this.applyFavoriteState([card]);
    return card;
  }

  private toRecommendationCard(item: RecommendationItemDto): PlaceCard | null {
    const normalizedType = item.itemType?.toLowerCase();
    if (normalizedType !== 'destination' && normalizedType !== 'object' && normalizedType !== 'activity') {
      return null;
    }

    const imageUrl = this.resolveMediaUrl(item.imageUrl);
    const metaText = this.recommendationMetaText(item);

    const card: PlaceCard = {
      title: item.title,
      location: item.location || item.categoryName || normalizedType,
      ratingText: metaText,
      imageUrl,
      isFavorite: false,
      itemId: item.itemId,
      itemType: normalizedType,
      targetUrl: `/${normalizedType}/${item.itemId}`,
      favoriteId: undefined,
      showRating: item.averageRating != null && (item.reviewCount ?? 0) > 0,
    };

    this.applyFavoriteState([card]);
    return card;
  }

  private mixRecommendedCards(
    destinations: PlaceCard[],
    activities: PlaceCard[],
    objects: PlaceCard[],
  ): PlaceCard[] {
    const groups = [destinations.slice(), activities.slice(), objects.slice()];
    const result: PlaceCard[] = [];

    while (result.length < 12 && groups.some((group) => group.length > 0)) {
      for (const group of groups) {
        if (group.length > 0) {
          result.push(group.shift()!);
        }

        if (result.length >= 12) {
          break;
        }
      }
    }

    return result;
  }

  private recommendationMetaText(item: RecommendationItemDto): string {
    if (item.averageRating != null && (item.reviewCount ?? 0) > 0) {
      return `${item.averageRating.toFixed(1)} (${item.reviewCount} reviews)`;
    }

    if (this.shouldShowLiveDistance() && item.distanceMeters != null && item.distanceMeters > 0) {
      const distanceText =
        item.distanceMeters >= 1000
          ? `${(item.distanceMeters / 1000).toFixed(1)} km away`
          : `${Math.round(item.distanceMeters)} m away`;

      if (item.itemType === 'activity') {
        const details = [item.price != null && item.price > 0 ? `EUR ${Math.round(item.price)}` : 'Free'];
        if (item.durationMinutes != null && item.durationMinutes > 0) {
          details.push(`${item.durationMinutes} min`);
        }

        return `${distanceText} - ${details.join(' - ')}`;
      }

      return distanceText;
    }

    if (item.itemType === 'activity') {
      const details = [item.price != null && item.price > 0 ? `EUR ${Math.round(item.price)}` : 'Free'];
      if (item.durationMinutes != null && item.durationMinutes > 0) {
        details.push(`${item.durationMinutes} min`);
      }

      return details.join(' - ');
    }

    return item.categoryName || '';
  }

  private shouldShowLiveDistance(): boolean {
    return (
      this.locationTrackingService.isTrackingEnabled() &&
      this.locationTrackingService.getCurrentLocation() != null
    );
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) continue;
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
    return undefined;
  }

  private readString(obj: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return undefined;
  }

  private pickDestinationImage(destination: {
    images?: unknown[];
    mainImageUrl?: string;
  }): string | undefined {
    const directUrl = this.resolveMediaUrl(destination.mainImageUrl);
    if (directUrl) {
      return directUrl;
    }

    const fromDto =
      destination.images?.find((i) => this.isMainImage(i as unknown as ImageDto)) ??
      destination.images?.[0];
    return this.resolveMediaUrl(this.readImageUrl(fromDto as unknown as ImageDto));
  }

  private pickObjectImage(object: { images?: unknown[]; mainImageUrl?: string }): string | undefined {
    const directUrl = this.resolveMediaUrl(object.mainImageUrl);
    if (directUrl) {
      return directUrl;
    }

    const fromDto =
      object.images?.find((i) => this.isMainImage(i as unknown as ImageDto)) ??
      object.images?.[0];
    return this.resolveMediaUrl(this.readImageUrl(fromDto as unknown as ImageDto));
  }

  private pickEventImage(event: { images?: unknown[]; mainImageUrl?: string }): string | undefined {
    const directUrl = this.resolveMediaUrl(this.readMainImageUrl(event as Record<string, unknown>));
    if (directUrl) {
      return directUrl;
    }

    const fromDto =
      event.images?.find((i) => this.isMainImage(i as unknown as ImageDto)) ??
      event.images?.[0];
    return this.resolveMediaUrl(this.readImageUrl(fromDto as unknown as ImageDto));
  }

  private readImageUrl(image?: ImageDto): string | undefined {
    if (!image) return undefined;
    const raw = image as unknown as Record<string, unknown>;
    const value = raw['url'] ?? raw['Url'];
    return typeof value === 'string' ? value : undefined;
  }

  private readMainImageUrl(raw: Record<string, unknown>): string | undefined {
    const value = raw['mainImageUrl'] ?? raw['MainImageUrl'];
    return typeof value === 'string' ? value : undefined;
  }

  private isMainImage(image?: ImageDto): boolean {
    if (!image) return false;
    const raw = image as unknown as Record<string, unknown>;
    const value = raw['isMain'] ?? raw['IsMain'];
    return Boolean(value);
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
  }

  private ratingText(item: { averageRating?: number; reviewCount?: number }): string {
    if (item.averageRating == null || item.reviewCount == null || item.reviewCount <= 0) {
      return 'No ratings yet';
    }

    return `${item.averageRating.toFixed(1)} (${item.reviewCount} reviews)`;
  }

  private activityMetaText(activity: {
    price?: number;
    durationMinutes?: number;
    activityTypeName: string;
  }): string {
    const priceText =
      activity.price == null || activity.price <= 0 ? 'Free' : `EUR ${Math.round(activity.price)}`;
    const durationText = activity.durationMinutes ? `${activity.durationMinutes} min` : null;

    if (durationText) {
      return `${priceText} • ${durationText}`;
    }

    return `${priceText} • ${activity.activityTypeName}`;
  }

  private eventDate(startDate: string): string {
    const date = new Date(startDate);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' });
  }

  private eventPrice(price?: number | null): string {
    if (!price || price <= 0) return 'Free';
    return `From EUR ${Math.round(price)}`;
  }

  private eventTime(startDate: string, endDate?: string | null): string {
    const start = new Date(startDate);
    const startText = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
    if (!endDate) return startText;

    const end = new Date(endDate);
    const endText = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    return `${startText}-${endText}`;
  }

  get normalizedQuery(): string {
    return this.searchQuery.trim().toLowerCase();
  }

  toggleFavorite(card: PlaceCard, event: Event): void {
    event.stopPropagation();

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    if (card.isFavorite && card.favoriteId) {
      this.favoriteService
        .remove(card.favoriteId)
        .pipe(catchError(() => of(void 0)))
        .subscribe(() => {
          this.patchFavorite(card.itemType, card.itemId, false, undefined);
        });
      return;
    }

    this.favoriteService
      .add(this.favoritePayload(card))
      .pipe(catchError(() => of(null)))
      .subscribe((favorite) => {
        if (!favorite) return;
        this.patchFavorite(card.itemType, card.itemId, true, favorite.id);
      });
  }

  private favoritePayload(card: PlaceCard): CreateFavoriteDto {
    switch (card.itemType) {
      case 'destination':
        return { destinationId: card.itemId };
      case 'object':
        return { objectId: card.itemId };
      case 'activity':
        return { activityId: card.itemId };
      default:
        return {};
    }
  }

  private patchFavorite(
    itemType: PlaceCard['itemType'],
    itemId: number,
    isFavorite: boolean,
    favoriteId?: number,
  ): void {
    const patch = (list: PlaceCard[]) => {
      for (const card of list) {
        if (card.itemType === itemType && card.itemId === itemId) {
          card.isFavorite = isFavorite;
          card.favoriteId = favoriteId;
        }
      }
    };

    const key = this.favoriteKey(itemType, itemId);
    if (isFavorite && favoriteId) {
      this.favoriteMap.set(key, favoriteId);
    } else {
      this.favoriteMap.delete(key);
    }

    patch(this.recommended);
    patch(this.popular);
    this.flushUi();
  }

  private applyFavoriteState(list: PlaceCard[]): void {
    for (const card of list) {
      const favoriteId = this.favoriteMap.get(this.favoriteKey(card.itemType, card.itemId));
      card.isFavorite = favoriteId != null;
      card.favoriteId = favoriteId;
    }
  }

  private favoriteKey(itemType: PlaceCard['itemType'], itemId: number): string {
    return `${itemType}:${itemId}`;
  }

  openPlace(card: any): void {
    const type = card.itemType.toLowerCase();

    let route = '';

    switch (type) {
      case 'object':
        route = 'object';
        break;
      case 'destination':
        route = 'destination';
        break;
      case 'activity':
        route = 'activity'
        break;
      default:
        return;
    }

    this.router.navigate([`/${route}`, card.itemId]);
  }
  openDestinations(): void {
    if (!this.currentFeatured) return;

    this.router.navigate(['/destination', this.currentFeatured.id]);
  }
  openEvent(event: any): void {
    this.router.navigate([`/event`, event.id]);
  }

  openCategory(category: HomeCategory): void {
    this.router.navigateByUrl(category.route);
  }

  openRegionPicker(): void {
    this.router.navigate(['/region']);
  }

  getCategoryIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'destination':
        return 'explore';

      case 'locality':
        return 'map';

      case 'object':
        return 'apartment';

      case 'event':
        return 'event';

      case 'activity':
        return 'hiking';

      default:
        return 'place';
    }
  }

  private flushUi(): void {
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });
  }
  openSeeAll(type: 'recommended' | 'popular'): void {
    const items = type === 'recommended'
      ? this.recommended
      : this.popular;

    this.router.navigate(['/results'], {
      state: {
        mode: type,
        items: items
      }
    });
  }
}
