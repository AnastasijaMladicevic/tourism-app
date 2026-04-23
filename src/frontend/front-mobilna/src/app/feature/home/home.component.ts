import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
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
  category: 'destination' | 'object' | 'event';
  markerType: string;
}
interface HomeCategory {
  label: string;
  route: string;
  key: 'object' | 'locality' | 'event' | 'activity' | 'destination'
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BottomNavComponent, FormsModule, MatIcon],
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
  featuredDestinations: any[] = [];
  currentFeatured: any = null;
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

  private favoriteMap = new Map<string, number>();

  constructor(
    public router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private activityService: ActivityService,
    private favoriteService: FavoriteService,
    private eventService: EventService,
    private authService: AuthService,
  ) {}
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
      .filter((x) => this.matchesAllTerms(x.item, terms))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    this.searchResults = scored.map((x) => x.item);
    this.showSuggestions = this.searchResults.length > 0;
    this.cdr.detectChanges();
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
    this.searchResults = [];
    this.showSuggestions = false;
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
  private getAmenityText(item: SearchResult): string {
    const type = item.markerType.toLowerCase();
    const amenityMap: Record<string, string> = {
      hotel: 'wifi parking gym bazen pool breakfast spa',
      restaurant: 'hrana food dine takeout wifi',
      kafana: 'bar music live terrace',
    };
    return amenityMap[type] ?? '';
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
    this.loadFeatured();
    this.loadUserName();
    this.loadPlaceCards();
    
    this.loadEventCards();
    this.loadFavorites();
    this.loadEvents();
  }
  ngOnDestroy(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }
  selectSuggestion(result: SearchResult): void {
    this.searchQuery = result.name;
    this.showSuggestions = false;

    switch (result.category) {
      case 'destination':
        this.router.navigate(['/destination', result.id]);
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
        location: e.localityName ?? e.destinationName ?? 'Montenegro',
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
    this.destinationService.getAll().subscribe((data: any[]) => {

      const list = this.toArray(data);
      if (list.length < 5) return;

      const now = new Date();

      const shuffled = [...list].sort(() => 0.5 - Math.random());
      
      this.featuredDestinations = shuffled.slice(0, 5);
      this.currentFeatured = this.featuredDestinations[0];
      this.startRotation();
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
    return this.isLoadingPlaces || this.isLoadingEvents;
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

    forkJoin({
      destinations: this.destinationService
        .getAll({ page: 1, pageSize: 24, sortBy: 'name', sortOrder: 'asc' })
        .pipe(catchError(() => of([] as unknown[]))),
      objects: this.objectService
        .getAll({ page: 1, pageSize: 24, sortBy: 'name', sortOrder: 'asc' })
        .pipe(catchError(() => of([] as unknown[]))),
      activities: this.activityService
        .getAll({ page: 1, pageSize: 24, sortBy: 'name', sortOrder: 'asc' })
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

        this.recommended = this.mixRecommendedCards(destinationCards, activityCards, objectCards);
        this.popular = destinationCards;
        this.flushUi();
        this.allItems = [
        ...this.toArray<DestinationDto>(destinations).map(d => this.normalizeDestination(d)).map(d => ({
          id: d.id, name: d.name, typeName: d.destinationTypeName,
          location: 'Montenegro', image: d.mainImageUrl, icon: 'place',
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

  private loadEventCards(): void {
    this.isLoadingEvents = true;

    this.eventService
      .getAll()
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

        this.upcomingEvents = future.slice(0, 8).map(
          (e): EventCard => ({
            id: e.id,
            title: e.name,
            location: e.localityName ?? e.destinationName ?? 'Montenegro',
            dateText: this.eventDate(e.startDate),
            priceText: this.eventPrice(e.price),
            isFree: !e.price || e.price <= 0,
            timeText: this.eventTime(e.startDate, e.endDate),
            imageUrl: this.pickEventImage(e),
          }),
        );

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
    destinationTypeName: string;
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
      destinationTypeName: String(dto['destinationTypeName'] ?? dto['DestinationTypeName'] ?? ''),
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
      mainImageUrl: this.readString(dto, ['mainImageUrl', 'MainImageUrl']),
      images: (dto['images'] ?? dto['Images']) as unknown[] | undefined,
    };
  }

  private toDestinationCard(destination: ReturnType<HomeComponent['normalizeDestination']>): PlaceCard {
    const card: PlaceCard = {
      title: destination.name,
      location: destination.destinationTypeName || 'Montenegro',
      imageUrl: this.pickDestinationImage(destination),
      isFavorite: false,
      itemId: destination.id,
      itemType: 'destination',
      targetUrl: '/attractions',
      showRating: false,
      ratingText: ""
    };

    this.applyFavoriteState([card]);
    return card;
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
      location: activity.localityName ?? activity.destinationName ?? activity.activityTypeName,
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

  cardBackground(imageUrl?: string): string | null {
    if (!imageUrl) {
      return null;
    }

    const safeUrl = imageUrl.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/"/g, '%22');
    return `url("${safeUrl}")`;
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
  openAttractions(): void {
    if (!this.currentFeatured) return;

  this.router.navigate(['/attraction', this.currentFeatured.id]);
  }
  openEvent(event: any): void {
    this.router.navigate([`/event`, event.id]);
  }

  openCategory(category: HomeCategory): void {
    this.router.navigateByUrl(category.route);
  }
  
  getCategoryIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'attraction':
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
}
