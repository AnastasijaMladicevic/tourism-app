import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { DestinationDto, DestinationService } from '../../services/destination';
import { EventDto, EventService } from '../../services/event';
import { FavoriteDto, FavoriteService } from '../../services/favorite';
import { ImageDto, ImageService } from '../../services/image';
import { environment } from '../../../environment/environment';

interface PlaceCard {
  title: string;
  location: string;
  ratingText: string;
  imageUrl?: string;
  isFavorite: boolean;
  destinationId: number;
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

  recommended: PlaceCard[] = [];
  popular: PlaceCard[] = [];
  upcomingEvents: EventCard[] = [];

  isLoadingPlaces = true;
  isLoadingEvents = true;

  private favoriteMap = new Map<number, number>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private destinationService: DestinationService,
    private favoriteService: FavoriteService,
    private eventService: EventService,
    private imageService: ImageService,
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

  private pickEventImage(event: { id: number; images?: unknown[] }): string | undefined {
    const fromDto =
      event.images?.find((i) => this.isMainImage(i as unknown as ImageDto)) ??
      event.images?.[0];
    return this.resolveMediaUrl(this.readImageUrl(fromDto as unknown as ImageDto));
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

    // Slike dolaze embedded sa destinacijama, ne trebamo GET /api/images endpoint
    this.destinationService
      .getAll()
      .pipe(
        catchError(() => of([] as unknown[])),
        finalize(() => {
          this.isLoadingPlaces = false;
          this.flushUi();
        }),
      )
      .subscribe((destinations) => {
        console.log('🚀 ~ HomeComponent ~ loadPlaceCards ~ destinations:', destinations);
        const destinationList = this.toArray<DestinationDto>(destinations);
        const active = destinationList
          .map((d) => this.normalizeDestination(d))
          .filter((d) => d.id > 0 && d.isActive !== false);

        const cards = active.map(
          (d): PlaceCard => ({
            title: d.name,
            location: d.destinationTypeName || 'Montenegro',
            ratingText: this.ratingText(d),
            imageUrl: this.pickDestinationImage(d, new Map()),
            isFavorite: this.favoriteMap.has(d.id),
            destinationId: d.id,
            favoriteId: this.favoriteMap.get(d.id),
          }),
        );
        console.log('🚀 ~ HomeComponent ~ loadPlaceCards ~ cards:', cards);

        const split = Math.min(8, cards.length);
        this.recommended = cards.slice(0, split);
        this.popular =
          cards.length > split
            ? cards.slice(split, split + 8)
            : cards.slice(0, Math.min(8, cards.length));
        this.flushUi();
      });
  }

  private loadEventCards(): void {
    this.isLoadingEvents = true;

    // Slike dolaze embedded sa eventima, ne trebamo GET /api/images endpoint
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
    // Samo učitaj favorites ako je korisnik ulogovan
    if (!this.isLoggedIn) {
      return;
    }

    this.favoriteService
      .getMyFavorites()
      .pipe(catchError(() => of([] as FavoriteDto[])))
      .subscribe((favorites) => {
        this.favoriteMap = new Map<number, number>();
        for (const f of favorites) {
          const raw = f as unknown as Record<string, unknown>;
          const destinationId = Number(raw['destinationId'] ?? raw['DestinationId'] ?? 0);
          const favoriteId = Number(raw['id'] ?? raw['Id'] ?? 0);
          if (destinationId && favoriteId) this.favoriteMap.set(destinationId, favoriteId);
        }

        const patch = (list: PlaceCard[]) => {
          for (const card of list) {
            card.isFavorite = this.favoriteMap.has(card.destinationId);
            card.favoriteId = this.favoriteMap.get(card.destinationId);
          }
        };

        patch(this.recommended);
        patch(this.popular);
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
      images: (dto['images'] ?? dto['Images']) as unknown[] | undefined,
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
    };
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

  private pickMainImageMap(
    images: ImageDto[],
    key: 'destinationId' | 'eventId',
  ): Map<number, string> {
    const grouped = new Map<number, ImageDto[]>();
    const keyPascal = key === 'destinationId' ? 'DestinationId' : 'EventId';

    for (const image of images ?? []) {
      const raw = image as unknown as Record<string, unknown>;
      const refId = Number(raw[key] ?? raw[keyPascal]);
      if (!refId) continue;
      const list = grouped.get(refId) ?? [];
      list.push(image);
      grouped.set(refId, list);
    }

    const result = new Map<number, string>();
    for (const [id, list] of grouped.entries()) {
      const main = list.find((i) => this.isMainImage(i)) ?? list[0];
      const resolved = this.resolveMediaUrl(this.readImageUrl(main));
      if (resolved) result.set(id, resolved);
    }
    return result;
  }

  private pickDestinationImage(
    destination: { id: number; images?: unknown[] },
    imageMap: Map<number, string>,
  ): string | undefined {
    const fromDto =
      destination.images?.find((i) => this.isMainImage(i as unknown as ImageDto)) ??
      destination.images?.[0];
    const dtoUrl = this.resolveMediaUrl(this.readImageUrl(fromDto as unknown as ImageDto));
    return dtoUrl || imageMap.get(destination.id);
  }

  private readImageUrl(image?: ImageDto): string | undefined {
    if (!image) return undefined;
    const raw = image as unknown as Record<string, unknown>;
    const value = raw['url'] ?? raw['Url'];
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

  private ratingText(destination: { averageRating?: number; reviewCount?: number }): string {
    if (destination.averageRating == null || destination.reviewCount == null)
      return 'No ratings yet';
    return `${destination.averageRating.toFixed(1)} (${destination.reviewCount} reviews)`;
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

    if (card.isFavorite && card.favoriteId) {
      this.favoriteService
        .remove(card.favoriteId)
        .pipe(catchError(() => of(void 0)))
        .subscribe(() => {
          this.patchFavorite(card.destinationId, false, undefined);
        });
      return;
    }

    this.favoriteService
      .add({ destinationId: card.destinationId })
      .pipe(catchError(() => of(null)))
      .subscribe((fav) => {
        if (!fav) return;
        this.patchFavorite(card.destinationId, true, fav.id);
      });
  }

  private patchFavorite(destinationId: number, isFavorite: boolean, favoriteId?: number): void {
    const patch = (list: PlaceCard[]) => {
      for (const card of list) {
        if (card.destinationId === destinationId) {
          card.isFavorite = isFavorite;
          card.favoriteId = favoriteId;
        }
      }
    };

    patch(this.recommended);
    patch(this.popular);
    this.flushUi();
  }

  cardBackground(imageUrl?: string): string | null {
    return imageUrl ? `url(${imageUrl})` : null;
  }

  openAttractions(): void {
    this.router.navigate(['/attractions']);
  }

  openEvents(): void {
    this.router.navigate(['/events']);
  }

  openHotels(): void {
    this.router.navigate(['/hotels']);
  }

  private flushUi(): void {
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });
  }
}
