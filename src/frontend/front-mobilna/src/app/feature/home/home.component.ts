import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, Observable, of, Subscription } from 'rxjs';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import { ActivityDto, ActivityService } from '../../services/activity';
import { CreateFavoriteDto, FavoriteDto, FavoriteService } from '../../services/favorite';
import { FavoriteStateService } from '../../services/favorite-state';
import { ImageDto } from '../../services/image';
import { environment } from '../../../environment/environment';
import { AuthService } from '../../services/auth';
import { ObjectDto, ObjectService } from '../../services/object';
import { MatIcon } from "@angular/material/icon";
import { LazyBackgroundDirective } from '../../shared/directives/lazy-background.directive';
import { RecommendationItemDto, RecommendationService } from '../../services/recommendation';
import { LocationTrackingService } from '../../services/location-tracking';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { EventPlannerService } from '../../services/event-planner';
import { PendingActionService } from '../../services/pending-action';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ActiveRegionService } from '../../services/active-region';
import { SmartSearchResultDto } from '../../services/smart-search';
import { LocalityDto, LocalityService } from '../../services/locality';
import { ElementRef, HostListener } from '@angular/core';
import { DataCacheService } from '../../services/data-cache';

interface PlaceCard {
  title: string;
  location: string;
  ratingText: string;
  imageUrl?: string;
  isFavorite: boolean;
  itemId: number;
  itemType: 'destination' | 'object' | 'activity' | 'event';
  targetUrl: string;
  favoriteId?: number;
  showRating: boolean;
  distanceText?: string;
  distanceMeters?: number;
  latitude?: number;
  longitude?: number;
  isPlanned?: boolean;
  plannerId?: number;
  description?: string;
  eventTypeName?: string;
  startDate?: string;
  endDate?: string | null;
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
  distanceText?: string;
  latitude?: number;
  longitude?: number;
  isPlanned?: boolean;
  plannerId?: number;
  description?: string;
  eventTypeName?: string;
  startDate?: string;
  endDate?: string | null;
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
interface HomeCategory {
  label: string;
  route: string;
  key: 'object' | 'locality' | 'event' | 'activity' | 'destination'
}

type SearchToken = {
  value: string;
  isShortPrefix: boolean;
};

type SearchIntent = {
  category?: HomeSearchResult['category'];
  markerTypes?: string[];
};

type HomeSearchResult = SmartSearchResultDto & {
  raw: Record<string, unknown>;
};

const SEARCH_STOP_WORDS = new Set([
  'gde', 'mogu', 'moze', 'mozete', 'da', 'na', 'sa', 'u', 'uz', 'za', 'od', 'do', 'i', 'ili',
  'nije', 'nisu', 'je', 'su', 'koji', 'koja', 'koje', 'mnogo', 'malo', 'malom', 'mala', 'male',
  'mali', 'skupa', 'skupo', 'skup', 'skupu', 'hrana', 'hranu', 'jel', 'ima', 'imas', 'neki',
  'neka', 'bas', 'predlog', 'molim', 'te', 'mi',
]);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BottomNavComponent, FormsModule, MatIcon, LazyBackgroundDirective, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  userName = '';
  searchQuery = '';
  readonly categories: HomeCategory[] = [
    { label: 'Destinations', route: '/destinations', key: 'destination' },
    { label: 'Localities', route: '/localities', key: 'locality' },
    { label: 'Objects', route: '/objects', key: 'object' },
    { label: 'Activities', route: '/activities', key: 'activity' },
    { label: 'Events', route: '/events', key: 'event' },
  ];
  featuredDestinations: FeaturedDestination[] = [];
  currentFeatured: FeaturedDestination | null = null;
  recommended: PlaceCard[] = [];
  popular: PlaceCard[] = [];
  events: any[] = [];
  upcomingEvents: EventCard[] = [];
  searchResults: HomeSearchResult[] = [];
  rotationInterval: any;
  currentIndex = 0;
  showSuggestions = false;
  isLoadingPlaces = true;
  isLoadingEvents = true;
  isLoadingRecommendations = true;
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  isPlannerBusy = false;
  private favoriteMap = new Map<string, number>();
  private fallbackRecommended: PlaceCard[] = [];
  private hasRecommendationResponse = false;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private plannerMap = new Map<number, number>();
  private lastRecommendationLocationKey: string | null = null;
  private searchIndex: HomeSearchResult[] = [];
  private isLoadingSearchIndex = false;
  private readonly locationSubs = new Subscription();
  private readonly handleFavoriteObject = (event: any) => {
    const obj = event.detail;
    if (obj) this.toggleFavorite(obj, new Event('click'));
  };
  private readonly handleAddToPlanner = (event: any) => {
    const obj = event.detail;
    if (obj) this.togglePlanner(obj, new Event('click'));
  };
  constructor(
    public router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private activityService: ActivityService,
    private favoriteService: FavoriteService,
    private favoriteStateService: FavoriteStateService,
    private eventService: EventService,
    private authService: AuthService,
    private recommendationService: RecommendationService,
    private locationTrackingService: LocationTrackingService,
    private plannerService: PlannerLocalPreferencesService,
    private eventPlannerService: EventPlannerService,
    private pendingActionService: PendingActionService,
    private translationService: TranslationService,
    private activeRegionService: ActiveRegionService,
    private localityService: LocalityService,
    private elementRef: ElementRef,
    private dataCacheService: DataCacheService,
  ) { }

  @HostListener('document:click', ['$event'])
   onDocumentClick(event: MouseEvent): void {
      const clickedInside = this.elementRef.nativeElement
      .querySelector('.search-area')
      ?.contains(event.target);

    if (!clickedInside) {
      this.showSuggestions = false;
      this.flushUi();
    }
  }
  
  private applyPlannerState(list: EventCard[]): void {
    for (const item of list) {
      item.isPlanned = this.plannerMap.has(item.id);
      item.plannerId = this.plannerMap.get(item.id);
    }
  }

  private get activeRegionId(): number {
    return this.activeRegionService.getActiveRegionId() ?? 1;
  }

  private applyPlannerStateToPlaceCards(list: PlaceCard[]): void {
    for (const item of list) {
      if (item.itemType !== 'event') {
        continue;
      }

      item.isPlanned = this.plannerMap.has(item.itemId);
      item.plannerId = this.plannerMap.get(item.itemId);
    }
  }

  private syncPlannerStateAcrossLists(): void {
    this.applyPlannerState(this.upcomingEvents);
    this.applyPlannerState(this.events as EventCard[]);
    this.applyPlannerStateToPlaceCards(this.recommended);
  }

  private readonly handleWindowFocus = (): void => {
    this.tryRefreshRecommendedCardsWithLocation();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.tryRefreshRecommendedCardsWithLocation();
    }
  };

  private loadPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.plannerMap.clear();
      this.syncPlannerStateAcrossLists();
      this.flushUi();
      return;
    }

    this.eventPlannerService.getMyPlanner({
      page: 1,
      pageSize: 200
    }).subscribe(res => {
      this.plannerMap.clear();

      res.items.forEach(item => {
        this.plannerMap.set(Number(item.eventId), item.id);
      });

      this.syncPlannerStateAcrossLists();
      this.flushUi();
    });
  }
  togglePlanner(eventItem: EventCard, e?: Event): void {
    e?.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'add-to-planner',
        payload: eventItem
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.isPlannerBusy) return;

    this.isPlannerBusy = true;

    const existingId = this.plannerMap.get(eventItem.id);

    // REMOVE
    if (existingId) {
      this.eventPlannerService.remove(existingId).subscribe({
        next: () => {
          this.plannerService.remove(existingId);
          this.plannerMap.delete(eventItem.id);
          eventItem.isPlanned = false;
          eventItem.plannerId = undefined;
          this.syncPlannerStateAcrossLists();
          this.isPlannerBusy = false;
          this.flushUi();
        },
        error: () => {
          this.isPlannerBusy = false;
          this.flushUi();
        }
      });

      return;
    }
    this.router.navigate(['/planner/add'], {
      state: {
        eventId: eventItem.id,
        title: eventItem.title,
        location: eventItem.location,
        startDate: eventItem.startDate,
        endDate: eventItem.endDate,
        type: eventItem?.eventTypeName || 'Dogadjaj',
        imageUrl: eventItem.imageUrl || this.resolveMediaUrl(eventItem?.imageUrl),
        description: eventItem?.description,
      }
    });
    this.isPlannerBusy = false;
  }

  get activeRegionNameKey(): string {
    const regionId = this.activeRegionId;
  
    const regions: Record<number, string> = {
      1: 'region.regions.montenegro.name',
      2: 'region.regions.serbia.name',
      3: 'region.regions.spain.name',
      4: 'region.regions.italy.name',
    };
  
    return regions[regionId] ?? regions[1];
  }

  togglePlannerForRecommended(card: PlaceCard, event?: Event): void {
    event?.stopPropagation();

    if (card.itemType !== 'event') {
      return;
    }

    this.togglePlanner(
      {
        id: card.itemId,
        title: card.title,
        location: card.location,
        dateText: '',
        priceText: '',
        isFree: false,
        timeText: '',
        imageUrl: card.imageUrl,
        distanceText: card.distanceText,
        latitude: card.latitude,
        longitude: card.longitude,
        isPlanned: card.isPlanned,
        plannerId: card.plannerId,
        description: card.description,
        eventTypeName: card.eventTypeName,
        startDate: card.startDate,
        endDate: card.endDate,
      },
      event,
    );
  }
  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.searchResults = [];
      this.showSuggestions = false;
      this.flushUi();
      return;
    }

    if (!this.searchIndex.length) {
      this.loadSearchIndex();
    }

    this.searchDebounceTimer = setTimeout(() => {
      if (this.searchQuery.trim() !== query) {
        return;
      }

      this.applyLocalSearch(query);
    }, 220);
  }
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSuggestions = false;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.flushUi();
  }

  private applyLocalSearch(query: string): void {
    if (!this.searchIndex.length) {
      this.searchResults = [];
      this.showSuggestions = false;
      this.flushUi();
      return;
    }

    if (this.searchQuery.trim() !== query) {
      return;
    }

    const results = this.runLocalSearch(query, 20);
    this.searchResults = results;
    this.showSuggestions = results.length > 0;
    this.flushUi();
  }

  private distanceTextFromCoords(latitude?: number | null, longitude?: number | null): string {
    if (!this.shouldShowLiveDistance() || latitude == null || longitude == null) {
      return '';
    }

    const currentLocation = this.locationTrackingService.getCurrentLocation();
    if (!currentLocation) return '';

    const distanceMeters = this.calculateDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      latitude,
      longitude
    );

    return distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km away`
      : `${Math.round(distanceMeters)} m away`;
  }
  
  getRegionFlag(): string {
    const regionId = this.activeRegionId;
  
    const flags: Record<number, string> = {
      1: 'https://flagcdn.com/w40/me.png',
      2: 'https://flagcdn.com/w40/rs.png',
      3: 'https://flagcdn.com/w40/es.png',
      4: 'https://flagcdn.com/w40/it.png',
    };
  
    return flags[regionId] ?? flags[1];
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const r = 6371000;
    const toRad = (value: number) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  submitSearch(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      return;
    }

    const topResult = this.searchResults[0];
    if (topResult) {
      this.selectSuggestion(topResult);
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: { q: query },
    });
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
    this.locationSubs.add(
      this.locationTrackingService.trackingEnabled$.subscribe(enabled => {
        this.isTracking = enabled;

        if (!enabled) {
          this.clearDistances();
        } else {
          this.updateDistances();
          this.tryRefreshRecommendedCardsWithLocation();
          this.cdr.detectChanges();
        }
      })
    );

    this.locationSubs.add(
      this.locationTrackingService.location$.subscribe(loc => {
        this.userLocation = loc
          ? { lat: loc.latitude, lng: loc.longitude }
          : null;

        if (this.userLocation) {
          this.updateDistances();
          this.tryRefreshRecommendedCardsWithLocation();
        } else {
          this.clearDistances();
        }
        this.cdr.detectChanges();
      })
    );
    this.loadUserName();
    this.loadPlaceCards();
    this.loadRecommendedCards();
    this.loadEventCards();
    this.loadFavorites();
    window.addEventListener('favorite-object', this.handleFavoriteObject);
    window.addEventListener('add-to-planner', this.handleAddToPlanner);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.cdr.detectChanges();
  }

  private updateDistances(): void {
    if (!this.userLocation) return;

    const updateList = (list: any[]) => {
      return list.map(item => {
        if (item.latitude == null || item.longitude == null) {
          return {
            ...item,
            distanceText:
              this.shouldShowLiveDistance() && item.distanceMeters != null
                ? this.distanceTextFromCoordsFromMeters(item.distanceMeters)
                : undefined
          };
        }

        const km = this.getDistanceKm(
          this.userLocation!.lat,
          this.userLocation!.lng,
          item.latitude,
          item.longitude
        );

        const text =
          km < 1
            ? `${Math.round(km * 1000)} m`
            : `${km.toFixed(1)} km`;

        return {
          ...item,
          distanceText: text
        };
      });
    };

    this.popular = updateList(this.popular);
    this.recommended = updateList(this.recommended);
    this.events = updateList(this.events);
  }
  private clearDistances(): void {
    const clearList = (list: any[]) =>
      list.map(item => ({
        ...item,
        distanceText: undefined
      }));

    this.popular = clearList(this.popular);
    this.recommended = clearList(this.recommended);
    this.events = clearList(this.events);
  }

  private getRecommendationLocationKey(): string | null {
    const currentLocation = this.locationTrackingService.getCurrentLocation();
    if (!this.locationTrackingService.isTrackingEnabled() || !currentLocation) {
      return null;
    }

    return `${currentLocation.latitude.toFixed(4)}:${currentLocation.longitude.toFixed(4)}`;
  }

  private tryRefreshRecommendedCardsWithLocation(): void {
    const locationKey = this.getRecommendationLocationKey();
    if (!locationKey || this.isLoadingRecommendations) {
      return;
    }

    if (!this.hasRecommendationResponse && !this.recommended.length) {
      return;
    }

    if (this.lastRecommendationLocationKey === locationKey) {
      return;
    }

    this.loadRecommendedCards();
  }

  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  getDistanceText(item: any): string | null {
    if (!this.isTracking || !this.userLocation) return null;
    if (!item.latitude || !item.longitude) return null;

    const km = this.getDistanceKm(
      this.userLocation.lat,
      this.userLocation.lng,
      item.latitude,
      item.longitude
    );

    return km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km.toFixed(1)} km`;
  }
  ngOnDestroy(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.locationSubs.unsubscribe();
    window.removeEventListener('favorite-object', this.handleFavoriteObject);
    window.removeEventListener('add-to-planner', this.handleAddToPlanner);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  selectSuggestion(result?: SmartSearchResultDto): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSuggestions = false;
    if (!result) {
      return;
    }

    this.openSearchResult(result);
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
    const regionId = this.activeRegionId;
    this.isLoadingPlaces = true;

    const lang = this.translationService.language().trim().toLowerCase();

    // Objects i activities ne zavise od jezika — poseban cache sa dužim TTL-om
    const baseKey = `home-base-cards:r${regionId}`;
    const destKey = `home-dest-cards:r${regionId}:l${lang}`;

    const cachedBase = this.dataCacheService.get<{ objects: unknown[]; activities: unknown[] }>(baseKey);
    const cachedDest = this.dataCacheService.get<unknown[]>(destKey);

    if (cachedBase && cachedDest) {
      this.isLoadingPlaces = false;
      this.processPlaceCards(cachedDest, cachedBase.objects, cachedBase.activities);
      return;
    }

    const destinations$ = cachedDest
      ? of(cachedDest)
      : this.destinationService
          .getAll({ page: 1, pageSize: 8, sortBy: 'name', sortOrder: 'asc', lang, regionId })
          .pipe(catchError(() => of([] as unknown[])));

    const objects$ = cachedBase
      ? of(cachedBase.objects)
      : this.objectService
          .getAll(
            { page: 1, pageSize: 8, sortBy: 'name', sortOrder: 'asc', regionId },
            { bypassLanguage: true },
          )
          .pipe(catchError(() => of([] as unknown[])));

    const activities$ = cachedBase
      ? of(cachedBase.activities)
      : this.activityService
          .getAll(
            { page: 1, pageSize: 8, sortBy: 'name', sortOrder: 'asc', regionId },
            { bypassLanguage: true },
          )
          .pipe(catchError(() => of([] as unknown[])));

    forkJoin({ destinations: destinations$, objects: objects$, activities: activities$ })
      .pipe(
        finalize(() => {
          this.isLoadingPlaces = false;
          this.flushUi();
        }),
      )
      .subscribe(({ destinations, objects, activities }) => {
        if (!cachedDest) this.dataCacheService.set(destKey, destinations as unknown[], 5 * 60 * 1000);
        if (!cachedBase) this.dataCacheService.set(baseKey, { objects, activities }, 10 * 60 * 1000);
        this.processPlaceCards(destinations, objects, activities);
      });
  }

  private processPlaceCards(destinations: unknown[], objects: unknown[], activities: unknown[]): void {
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
      this.currentIndex = 0;
      this.translateFeaturedDisplayTitles(selectedFeatured).subscribe((res) => {
        this.featuredDestinations = res;
        this.currentFeatured = this.featuredDestinations[0];
        this.startRotation();
        this.flushUi();
      });
    } else {
      this.featuredDestinations = [];
      this.currentFeatured = null;
    }

    this.flushUi();
  }

  private translateFeaturedDisplayTitles(
    featured: FeaturedDestination[]
  ): Observable<FeaturedDestination[]> {
    const lang = this.translationService.language().trim().toLowerCase();

    if (!featured.length || lang === 'sr' || lang === 'me') {
      return of(featured);
    }

    return forkJoin(
      featured.map((item) => {
        const cacheKey = `feat-translation:${item.id}:l${lang}`;
        const cached = this.dataCacheService.get<string>(cacheKey);

        if (cached !== null) {
          return of(cached ? { ...item, displayTitle: cached } : item);
        }

        return this.http
          .get<ApiTranslationDto[]>(
            `${environment.apiUrl}/translations?entityType=Destination&entityId=${item.id}`
          )
          .pipe(
            map((translations) => {
              const translatedTitle = translations
                .find(
                  (t) =>
                    t.fieldName?.toLowerCase() === 'displaytitle' &&
                    t.languageCode?.toLowerCase() === lang
                )
                ?.translatedText?.trim() ?? '';

              this.dataCacheService.set(cacheKey, translatedTitle, 15 * 60 * 1000);
              return translatedTitle ? { ...item, displayTitle: translatedTitle } : item;
            }),
            catchError(() => of(item)),
          );
      })
    );
  }

  private loadRecommendedCards(): void {
    const regionId = this.activeRegionId;
    this.isLoadingRecommendations = true;

    const currentLocation = this.locationTrackingService.getCurrentLocation();
    const canUseLocation = this.shouldShowLiveDistance();
    const requestedLocationKey =
      canUseLocation && currentLocation
        ? `${currentLocation.latitude.toFixed(4)}:${currentLocation.longitude.toFixed(4)}`
        : null;

    this.recommendationService
      .getHomeRecommendations({
        pageSize: 12,
        regionId,
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
        this.lastRecommendationLocationKey = requestedLocationKey;

        const cards = items
          .map((item) => this.toRecommendationCard(item))
          .filter((card): card is PlaceCard => !!card);

        this.recommended = cards.length ? cards : [...this.fallbackRecommended];
        this.applyFavoriteState(this.recommended);
        this.applyPlannerStateToPlaceCards(this.recommended);
        this.flushUi();
      });
  }

  private loadEventCards(): void {
    const regionId = this.activeRegionId;
    this.isLoadingEvents = true;

    const cacheKey = `home-event-cards:r${regionId}`;
    const cached = this.dataCacheService.get<unknown[]>(cacheKey);
    if (cached) {
      this.isLoadingEvents = false;
      this.processEventCards(cached);
      return;
    }

    this.eventService
      .getAll(
        { page: 1, pageSize: 12, sortBy: 'startDate', sortOrder: 'asc', regionId },
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
        this.dataCacheService.set(cacheKey, events as unknown[]);
        this.processEventCards(events as unknown[]);
      });
    this.loadPlanner();
  }

  private processEventCards(events: unknown[]): void {
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
        distanceText: this.distanceTextFromCoords(e.latitude, e.longitude),
        latitude: e.latitude,
        longitude: e.longitude,
        startDate: e.startDate,
        endDate: e.endDate,
      }),
    );

    this.upcomingEvents = eventCards;
    this.events = eventCards;
    this.syncPlannerStateAcrossLists();
    this.flushUi();
  }

  private loadFavorites(): void {
    if (!this.isLoggedIn) {
      return;
    }

    this.favoriteStateService
      .loadFavorites(false)
      .pipe(catchError(() => of(new Map<string, number>())))
      .subscribe((favoriteMap) => {
        this.favoriteMap = favoriteMap;
        this.applyFavoriteState(this.recommended);
        this.applyFavoriteState(this.popular);
        this.flushUi();
      });
  }

  private loadSearchIndex(): void {
    if (this.isLoadingSearchIndex || this.searchIndex.length > 0) {
      return;
    }

    // Indeks ne zavisi od jezika — isti podaci za sve jezike
    const cacheKey = 'search-index';
    const cached = this.dataCacheService.get<HomeSearchResult[]>(cacheKey);
    if (cached) {
      this.searchIndex = cached;
      if (this.searchQuery.trim().length >= 2) {
        this.applyLocalSearch(this.searchQuery.trim());
      }
      return;
    }

    this.isLoadingSearchIndex = true;

    forkJoin({
      destinations: this.destinationService
        .getAll(
          { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true },
        )
        .pipe(catchError(() => of([] as DestinationDto[]))),
      objects: this.objectService
        .getAllItems(
          { sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true, bypassLanguage: true },
        )
        .pipe(catchError(() => of([] as ObjectDto[]))),
      events: this.eventService
        .getAllItems(
          { sortBy: 'startDate', sortOrder: 'asc' },
          { bypassRegion: true, bypassLanguage: true },
        )
        .pipe(catchError(() => of([] as EventDto[]))),
      activities: this.activityService
        .getAll(
          { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true },
        )
        .pipe(catchError(() => of([] as ActivityDto[]))),
      localities: this.localityService
        .getAll(
          { page: 1, pageSize: 500, sortBy: 'name', sortOrder: 'asc' },
          { bypassRegion: true },
        )
        .pipe(catchError(() => of([] as LocalityDto[]))),
    })
      .pipe(
        finalize(() => {
          this.isLoadingSearchIndex = false;

          if (this.searchQuery.trim().length >= 2) {
            this.applyLocalSearch(this.searchQuery.trim());
          }
        }),
      )
      .subscribe(({ destinations, objects, events, activities, localities }) => {
        const destinationResults = this.toArray<DestinationDto>(destinations)
          .map((destination) => this.normalizeDestination(destination))
          .filter((destination) => destination.id > 0 && destination.isActive !== false)
          .map((destination) => this.toHomeSearchResult(destination, 'destination', 'destination'));

        const objectResults = this.toArray<ObjectDto>(objects)
          .map((obj) => this.normalizeObject(obj))
          .filter((obj) => obj.id > 0 && obj.isActive !== false)
          .map((obj) => this.toHomeSearchResult(obj, this.getObjectSearchType(obj.objectTypeName), 'object'));

        const eventResults = this.toArray<EventDto>(events)
          .map((event) => this.normalizeEvent(event))
          .filter((event) => event.id > 0 && event.isActive !== false)
          .map((event) => this.toHomeSearchResult(event, 'event', 'event'));

        const activityResults = this.toArray<ActivityDto>(activities)
          .map((activity) => this.normalizeActivity(activity))
          .filter((activity) => activity.id > 0 && activity.isActive !== false)
          .map((activity) => this.toHomeSearchResult(activity, 'activity', 'activity'));

        const localityResults = this.toArray<LocalityDto>(localities)
          .filter((locality) => locality.id > 0 && locality.isActive !== false)
          .map((locality) => this.toHomeSearchResult(locality as unknown as Record<string, unknown>, 'locality', 'locality'));

        this.searchIndex = [
          ...objectResults,
          ...destinationResults,
          ...eventResults,
          ...activityResults,
          ...localityResults,
        ];
        this.dataCacheService.set(cacheKey, this.searchIndex, 10 * 60 * 1000);
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

  private toHomeSearchResult(
    raw: Record<string, unknown>,
    markerType: string,
    category: HomeSearchResult['category'],
  ): HomeSearchResult {
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

    const images = Array.isArray(raw['images']) ? (raw['images'] as Array<Record<string, unknown>>) : [];
    const firstImageUrl = typeof images[0]?.['url'] === 'string' ? String(images[0]['url']) : '';

    return {
      id: Number(raw['id'] ?? 0),
      name: String(raw['name'] ?? ''),
      typeName:
        String(
          raw['objectTypeName'] ??
          raw['destinationTypeName'] ??
          raw['eventTypeName'] ??
          raw['activityTypeName'] ??
          raw['localityTypeName'] ??
          markerType,
        ),
      location: String(raw['localityName'] ?? raw['destinationName'] ?? raw['regionName'] ?? ''),
      category,
      markerType,
      icon: iconMap[markerType] ?? iconMap['default'],
      imageUrl: this.resolveMediaUrl(String(raw['mainImageUrl'] ?? firstImageUrl ?? '')),
      latitude: Number(raw['latitude'] ?? 0) || undefined,
      longitude: Number(raw['longitude'] ?? 0) || undefined,
      matchReason: 'Keyword match',
      score: 0,
      raw,
    };
  }

  private runLocalSearch(query: string, limit: number): HomeSearchResult[] {
    const tokens = this.buildSearchTokens(query);
    const normalizedQuery = this.normalizeForSearch(query);

    return this.searchIndex
      .map((item) => ({
        item,
        score: this.scoreSearchResult(item, tokens, normalizedQuery),
      }))
      .filter((entry) => this.matchesAllTokens(entry.item, tokens))
      .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  private buildSearchTokens(query: string): SearchToken[] {
    const normalizedQuery = this.normalizeForSearch(query);
    const rawTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const longTokens = rawTokens.filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));
    const lastToken = rawTokens[rawTokens.length - 1];

    if (lastToken && lastToken.length === 1 && rawTokens.length > 1 && !SEARCH_STOP_WORDS.has(lastToken)) {
      longTokens.push(lastToken);
    }

    if (longTokens.length > 0) {
      return [...new Set(longTokens)].map((token) => ({
        value: token,
        isShortPrefix: token.length === 1,
      }));
    }

    return normalizedQuery.length >= 2
      ? [{ value: normalizedQuery, isShortPrefix: false }]
      : [];
  }

  private matchesAllTokens(item: HomeSearchResult, tokens: SearchToken[]): boolean {
    if (!tokens.length) {
      return true;
    }

    const haystacks = this.buildSearchHaystacks(item);

    return tokens.every((token) =>
      haystacks.some((value) =>
        token.isShortPrefix
          ? this.matchesWordPrefix(value, token.value)
          : value.includes(token.value),
      ),
    );
  }

  private scoreSearchResult(
    item: HomeSearchResult,
    tokens: SearchToken[],
    normalizedQuery: string,
  ): number {
    const intent = this.inferSearchIntent(normalizedQuery);
    const haystacks = this.buildSearchHaystacks(item);
    const name = this.normalizeForSearch(item.name);
    const typeName = this.normalizeForSearch(item.typeName);
    const typeThenName = this.normalizeForSearch(`${item.typeName} ${item.name}`);
    const nameThenType = this.normalizeForSearch(`${item.name} ${item.typeName}`);
    const searchable = this.normalizeForSearch(this.getSearchableText(item));

    let score = 0;

    if (intent.category) {
      score += intent.category === item.category ? 20 : -18;
    }

    if (intent.markerTypes?.length) {
      score += intent.markerTypes.includes(item.markerType) ? 24 : -20;
    }

    if (normalizedQuery) {
      if (typeThenName.startsWith(normalizedQuery)) score += 24;
      if (nameThenType.startsWith(normalizedQuery)) score += 20;
      if (name.startsWith(normalizedQuery)) score += 18;
      if (typeName.startsWith(normalizedQuery)) score += 12;
      if (searchable.includes(normalizedQuery)) score += 6;
      if (haystacks.some((value) => value.includes(normalizedQuery))) score += 4;
    }

    for (const token of tokens) {
      if (token.isShortPrefix) {
        if (this.matchesWordPrefix(typeThenName, token.value)) score += 10;
        if (this.matchesWordPrefix(nameThenType, token.value)) score += 8;
        if (this.matchesWordPrefix(name, token.value)) score += 7;
        if (this.matchesWordPrefix(typeName, token.value)) score += 5;
        continue;
      }

      if (name.includes(token.value)) score += 8;
      if (typeName.includes(token.value)) score += 6;
      if (typeThenName.includes(token.value)) score += 5;
      if (searchable.includes(token.value)) score += 3;
    }

    return score;
  }

  private buildSearchHaystacks(item: HomeSearchResult): string[] {
    return [
      item.name,
      item.typeName,
      item.location,
      `${item.typeName} ${item.name}`,
      `${item.name} ${item.typeName}`,
      this.getSearchableText(item),
    ]
      .filter(Boolean)
      .map((value) => this.normalizeForSearch(value));
  }

  private matchesWordPrefix(value: string, token: string): boolean {
    return value
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .some((part) => part.startsWith(token));
  }

  private normalizeForSearch(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private getSearchableText(item: HomeSearchResult): string {
    const source = item.raw ?? {};
    const amenities = Array.isArray(source['amenities']) ? source['amenities'].join(' ') : '';
    const description = String(source['description'] ?? '');
    const cuisineType = String(source['cuisineType'] ?? '');
    const objectTypeName = String(source['objectTypeName'] ?? '');
    const eventTypeName = String(source['eventTypeName'] ?? '');
    const destinationTypeName = String(source['destinationTypeName'] ?? '');
    const activityTypeName = String(source['activityTypeName'] ?? '');
    const localityTypeName = String(source['localityTypeName'] ?? '');
    const address = String(source['address'] ?? '');

    return [
      description,
      amenities,
      cuisineType,
      objectTypeName,
      eventTypeName,
      destinationTypeName,
      activityTypeName,
      localityTypeName,
      address,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private getObjectSearchType(name: string): string {
    const normalized = this.normalizeForSearch(name);

    if (
      normalized.includes('hotel') ||
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

    return 'destination';
  }

  private inferSearchIntent(normalizedQuery: string): SearchIntent {
    if (
      this.containsHint(normalizedQuery, [
        'restoran',
        'restaurant',
        'konoba',
        'bistro',
        'pizzeria',
        'taverna',
      ])
    ) {
      return { category: 'object', markerTypes: ['restaurant'] };
    }

    if (
      this.containsHint(normalizedQuery, [
        'kafana',
        'bar',
        'cafe',
        'kafic',
        'pub',
        'club',
        'klub',
        'winery',
        'vinarija',
      ])
    ) {
      return { category: 'object', markerTypes: ['kafana'] };
    }

    if (
      this.containsHint(normalizedQuery, [
        'hotel',
        'resort',
        'hostel',
        'motel',
        'apartman',
        'apartment',
        'villa',
      ])
    ) {
      return { category: 'object', markerTypes: ['hotel', 'apartment'] };
    }

    if (this.containsHint(normalizedQuery, ['dogadjaj', 'događaj', 'event', 'festival', 'koncert'])) {
      return { category: 'event' };
    }

    if (this.containsHint(normalizedQuery, ['aktivnost', 'activity', 'tura', 'izlet'])) {
      return { category: 'activity' };
    }

    if (this.containsHint(normalizedQuery, ['lokalitet', 'locality', 'znamenitost'])) {
      return { category: 'locality' };
    }

    if (this.containsHint(normalizedQuery, ['destinacija', 'destination', 'grad', 'plaza', 'plaža', 'planina'])) {
      return { category: 'destination' };
    }

    return {};
  }

  private containsHint(normalizedQuery: string, hints: string[]): boolean {
    return hints.some((hint) => normalizedQuery.startsWith(hint) || normalizedQuery.includes(` ${hint}`));
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
    latitude?: number;
    longitude?: number;
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
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
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
    latitude?: number;
    longitude?: number;
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
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
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
    latitude?: number;
    longitude?: number;
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
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
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
    latitude?: number;
    longitude?: number;
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
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
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
      ratingText: "",
      distanceText: this.distanceTextFromCoords(destination.latitude, destination.longitude),
      latitude: destination.latitude,
      longitude: destination.longitude,
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
      distanceText: this.distanceTextFromCoords(object.latitude, object.longitude),
      latitude: object.latitude,
      longitude: object.longitude,
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
      distanceText: this.distanceTextFromCoords(activity.latitude, activity.longitude),
      latitude: activity.latitude,
      longitude: activity.longitude,
    };

    this.applyFavoriteState([card]);
    return card;
  }

  private toRecommendationCard(item: RecommendationItemDto): PlaceCard | null {
    const normalizedType = item.itemType?.toLowerCase();
    if (
      normalizedType !== 'destination' &&
      normalizedType !== 'object' &&
      normalizedType !== 'activity' &&
      normalizedType !== 'event'
    ) {
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
      distanceMeters: item.distanceMeters ?? undefined,
      distanceText:
        this.shouldShowLiveDistance() && item.distanceMeters != null
          ? this.distanceTextFromCoordsFromMeters(item.distanceMeters)
          : undefined,
      eventTypeName: normalizedType === 'event' ? item.categoryName || 'Dogadjaj' : undefined,
    };

    this.applyFavoriteState([card]);
    this.applyPlannerStateToPlaceCards([card]);
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
      return `${item.averageRating.toFixed(1)} (${item.reviewCount} ${this.translationService.translate('common.reviews')})`;
    }

    if (this.shouldShowLiveDistance() && item.distanceMeters != null && item.distanceMeters > 0) {
      const distanceText =
        item.distanceMeters >= 1000
          ? `${(item.distanceMeters / 1000).toFixed(1)} km away`
          : `${Math.round(item.distanceMeters)} m away`;
      /*
            if (item.itemType === 'activity') {
              const details = [item.price != null && item.price > 0 ? `EUR ${Math.round(item.price)}` : 'Free'];
              if (item.durationMinutes != null && item.durationMinutes > 0) {
                details.push(`${item.durationMinutes} min`);
              }
      
              return `${distanceText} - ${details.join(' - ')}`;
            } */

      return distanceText;
    }
    /*
        if (item.itemType === 'activity') {
          const details = [item.price != null && item.price > 0 ? `EUR ${Math.round(item.price)}` : 'Free'];
          if (item.durationMinutes != null && item.durationMinutes > 0) {
            details.push(`${item.durationMinutes} min`);
          }
    
          return details.join(' - ');
        } */

    return item.categoryName || '';
  }

  private distanceTextFromCoordsFromMeters(distanceMeters: number): string {
    return distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km away`
      : `${Math.round(distanceMeters)} m away`;
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

    return `${item.averageRating.toFixed(1)} (${item.reviewCount} ${this.translationService.translate('common.reviews')})`;
  }

  private activityMetaText(activity: {
    activityTypeName: string;
  }) {
    return activity.activityTypeName;
  }

  /* private activityMetaText(activity: {
     price?: number;
    durationMinutes?: number;
    activityTypeName: string;
  }):  string {
     const priceText =
      activity.price == null || activity.price <= 0 ? 'Free' : `EUR ${Math.round(activity.price)}`;
    const durationText = activity.durationMinutes ? `${activity.durationMinutes} min` : null; 

     if (durationText) {
      return `${priceText} • ${durationText}`;
    } 

    return `${priceText} • ${activity.activityTypeName}`;
  } */

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

    const startText = start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!endDate) return startText;

    const end = new Date(endDate);
    const endText = end.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${startText} - ${endText}`;
  }

  private extractTime(dateStr: string): string {
    if (!dateStr) return '--:--';

    const timePart = dateStr.split('T')[1];
    if (!timePart) return '--:--';

    return timePart.substring(0, 5); // HH:mm
  }

  get normalizedQuery(): string {
    return this.searchQuery.trim().toLowerCase();
  }

  toggleFavorite(card: PlaceCard, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: card
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

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
      case 'event':
        route = 'event';
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

  private openSearchResult(result: SmartSearchResultDto): void {
    switch (result.category) {
      case 'destination':
        this.router.navigate(['/destination', result.id]);
        break;
      case 'locality':
        this.router.navigate(['/locality', result.id]);
        break;
      case 'object':
        this.router.navigate(['/object', result.id]);
        break;
      case 'event':
        this.router.navigate(['/event', result.id]);
        break;
      case 'activity':
        this.router.navigate(['/activity', result.id]);
        break;
    }
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
