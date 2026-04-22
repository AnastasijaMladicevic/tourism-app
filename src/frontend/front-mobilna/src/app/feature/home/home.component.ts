import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import { ActivityDto, ActivityService } from '../../services/activity';
import { CreateFavoriteDto, FavoriteDto, FavoriteService } from '../../services/favorite';
import { ImageDto } from '../../services/image';
import { environment } from '../../../environment/environment';
import { ObjectDto, ObjectService } from '../../services/object';

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

interface HomeCategory {
  label: string;
  route: string;
  icon:
    | 'hotel'
    | 'restaurant'
    | 'cafe'
    | 'mountain'
    | 'home'
    | 'sparkles'
    | 'monument'
    | 'museum'
    | 'gallery'
    | 'bar'
    | 'church'
    | 'sport';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, BottomNavComponent, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  userName = 'Alex Taylor';
  searchQuery = '';
  readonly categories: HomeCategory[] = [
    { label: 'Hotels', route: '/objects/hotels', icon: 'hotel' },
    { label: 'Restaurants', route: '/objects/restaurants', icon: 'restaurant' },
    { label: 'Kafane', route: '/objects/kafane', icon: 'cafe' },
    { label: 'Planinarski domovi', route: '/objects/planinarski-domovi', icon: 'mountain' },
    { label: 'Apartments', route: '/objects/apartments', icon: 'home' },
    { label: 'Spa centers', route: '/objects/spa-centers', icon: 'sparkles' },
    { label: 'Monuments', route: '/objects/monuments', icon: 'monument' },
    { label: 'Museums', route: '/objects/museums', icon: 'museum' },
    { label: 'Galleries', route: '/objects/galleries', icon: 'gallery' },
    { label: 'Cafes', route: '/objects/cafes', icon: 'cafe' },
    { label: 'Bars', route: '/objects/bars', icon: 'bar' },
    { label: 'Pensions', route: '/objects/pensions', icon: 'hotel' },
    { label: 'Churches', route: '/objects/churches', icon: 'church' },
    { label: 'Monasteries', route: '/objects/monasteries', icon: 'church' },
    { label: 'Sports centers', route: '/objects/sports-centers', icon: 'sport' },
    { label: 'Wellness centers', route: '/objects/wellness-centers', icon: 'sparkles' },
  ];

  recommended: PlaceCard[] = [];
  popular: PlaceCard[] = [];
  upcomingEvents: EventCard[] = [];

  isLoadingPlaces = true;
  isLoadingEvents = true;

  private favoriteMap = new Map<string, number>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private destinationService: DestinationService,
    private objectService: ObjectService,
    private activityService: ActivityService,
    private favoriteService: FavoriteService,
    private eventService: EventService,
  ) {}

  ngOnInit(): void {
    this.loadUserName();
    this.loadPlaceCards();
    this.loadEventCards();
    this.loadFavorites();
  }

  get isLoadingHome(): boolean {
    return this.isLoadingPlaces || this.isLoadingEvents;
  }

  private get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  private loadUserName(): void {
    const raw = localStorage.getItem('user');
    if (!raw) return;

    try {
      const user = JSON.parse(raw) as { firstName?: string; lastName?: string };
      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
      if (fullName) this.userName = fullName;
    } catch {
      this.userName = 'Alex Taylor';
    }
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
      ratingText: this.ratingText(destination),
      imageUrl: this.pickDestinationImage(destination),
      isFavorite: false,
      itemId: destination.id,
      itemType: 'destination',
      targetUrl: '/attractions',
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

  get filteredRecommended(): PlaceCard[] {
    return this.filterPlaces(this.recommended);
  }

  get filteredPopular(): PlaceCard[] {
    return this.filterPlaces(this.popular);
  }

  get filteredEvents(): EventCard[] {
    const q = this.normalizedQuery;
    if (!q) return this.upcomingEvents;
    return this.upcomingEvents.filter(
      (e) => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q),
    );
  }

  private filterPlaces(list: PlaceCard[]): PlaceCard[] {
    const q = this.normalizedQuery;
    if (!q) return list;
    return list.filter(
      (p) => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
    );
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

  openPlace(card: PlaceCard): void {
    this.router.navigateByUrl(card.targetUrl);
  }

  openAttractions(): void {
    this.router.navigate(['/attractions']);
  }

  openEvents(): void {
    this.router.navigate(['/events']);
  }

  openCategory(category: HomeCategory): void {
    this.router.navigateByUrl(category.route);
  }

  categoryIconPath(icon: HomeCategory['icon']): string {
    switch (icon) {
      case 'hotel':
        return 'M4.5 19V6.75A1.75 1.75 0 0 1 6.25 5h11.5A1.75 1.75 0 0 1 19.5 6.75V19M2.75 19h18.5M8 9.25h3M13 9.25h3M8 12.75h3M13 12.75h3';
      case 'restaurant':
        return 'M7.25 4.5v7.25M5 4.5v4.25a2.25 2.25 0 0 0 4.5 0V4.5M14.5 4.5v14.75M14.5 9.25h3.75c.41 0 .75-.34.75-.75V6.75A2.25 2.25 0 0 0 16.75 4.5H14.5';
      case 'cafe':
        return 'M6 10.5h9.5a0 0 0 0 1 0 0v2.25A3.75 3.75 0 0 1 11.75 16.5H9.75A3.75 3.75 0 0 1 6 12.75V10.5A0 0 0 0 1 6 10.5Zm9.5.5h1A2.5 2.5 0 0 1 19 13.5h0A2.5 2.5 0 0 1 16.5 16h-1M8 5.5c0 1-1 1.5-1 2.5M11 5.5c0 1-1 1.5-1 2.5M14 5.5c0 1-1 1.5-1 2.5M6 19h11';
      case 'mountain':
        return 'M3.75 18.5 9.5 8.25l2.75 4.25 2-2.75 5 8.75M8.75 18.5h10.5';
      case 'home':
        return 'M4.75 10.25 12 4.5l7.25 5.75V18a1 1 0 0 1-1 1h-3.5v-5.25h-5.5V19h-3.5a1 1 0 0 1-1-1v-7.75Z';
      case 'sparkles':
        return 'M12 4.5 13.2 8.1 16.8 9.3 13.2 10.5 12 14.1 10.8 10.5 7.2 9.3 10.8 8.1 12 4.5Zm5 8 0.7 2.1 2.1 0.7-2.1 0.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1ZM6.5 13.5l0.8 2.3 2.2 0.8-2.2 0.7-.8 2.3-.7-2.3-2.3-.7 2.3-.8.7-2.3Z';
      case 'monument':
        return 'M6 19h12M8 19V9.25h8V19M7 9.25h10L12 5 7 9.25Zm2.5 3v4.5M12 12.25v4.5M14.5 12.25v4.5';
      case 'museum':
        return 'M4.5 8.75 12 5l7.5 3.75M5.75 10.25h12.5M6.5 10.25V18M10 10.25V18M14 10.25V18M17.5 10.25V18M4.5 19h15';
      case 'gallery':
        return 'M5.25 6.25h13.5a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H5.25a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1Zm2.5 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm10 6.5-3.25-3.25-3 3-1.5-1.5-3 3';
      case 'bar':
        return 'M7 5.5h10l-3.25 5v3.75a1 1 0 0 0 .3.7l1.2 1.2V18.5h-6.5v-1.35l1.2-1.2a1 1 0 0 0 .3-.7V10.5L7 5.5Z';
      case 'church':
        return 'M12 4.25v3.5M10.25 6h3.5M6.5 19v-7.25h11V19M8.5 11.75V8.5L12 6l3.5 2.5v3.25M10.25 19v-3.75h3.5V19';
      case 'sport':
        return 'M7 18.5 10 12l2.25 3.25L17 5.5M6 8.5h3.25M13.5 18.5h4.5';
      default:
        return '';
    }
  }

  private flushUi(): void {
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });
  }
}
