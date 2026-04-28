import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { catchError, forkJoin, of } from 'rxjs';

import {
  EventDto,
  EventService,
  PagedEventResultDto,
} from '../../services/event';
import { ImageDto, ImageService } from '../../services/image';
import { AuthService } from '../../services/auth';
import { FavoriteStateService, FavoriteTarget } from '../../services/favorite-state';
import { MapComponent } from '../../shared/components/map/map';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent, TranslatePipe],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventDetailComponent implements OnInit {
  event: EventDto | null = null;
  images: ImageDto[] = [];
  nearbyEvents: EventDto[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  isFavorite = false;
  favoriteId?: number;
  isFavoriteBusy = false;

  showGalleryModal = false;
  currentImageIndex = 0;

  private touchStartX = 0;
  private touchEndX = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private imageService: ImageService,
    private authService: AuthService,
    private favoriteStateService: FavoriteStateService,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      event: this.eventService.getById(id),
      images: this.imageService.getForEvent(id),
    }).subscribe({
      next: ({ event, images }) => {
        const normalizedEvent = this.normalizeEvent(event);

        this.event = normalizedEvent;
        this.images = images || [];
        this.mainImage = this.getMainImage(this.images, normalizedEvent);
        this.syncFavoriteState();

        this.loadNearbyEvents(normalizedEvent);
      },
      error: (err) => {
        console.error('Failed to load event details:', err);
        this.isLoading = false;
        this.errorMessage = this.translationService.translate('event.loadingError');
        this.cdr.detectChanges();
      },
    });
  }

  private loadNearbyEvents(currentEvent: EventDto): void {
    if (currentEvent.latitude == null || currentEvent.longitude == null) {
      this.nearbyEvents = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.eventService
      .getNearby({
        latitude: currentEvent.latitude,
        longitude: currentEvent.longitude,
        radiusMeters: 5000,
        page: 1,
        pageSize: 6,
        sortOrder: 'asc',
      })
      .subscribe({
        next: (result) => {
          this.nearbyEvents = this.extractItems(result)
            .map((item) => this.normalizeEvent(item))
            .filter((item) => item.id !== currentEvent.id)
            .slice(0, 3);

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load nearby events:', err);
          this.nearbyEvents = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private extractItems(result: PagedEventResultDto<EventDto> | Record<string, unknown> | null | undefined): EventDto[] {
    if (!result || typeof result !== 'object') {
      return [];
    }

    const raw = result as Record<string, unknown>;
    const candidates = [raw['items'], raw['Items'], raw['data'], raw['Data'], raw['results'], raw['Results']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as EventDto[];
      }
    }

    return [];
  }

  private normalizeEvent(raw: EventDto): EventDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      mainImageUrl: (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      distanceMeters: this.readOptionalNumber(dto, ['distanceMeters', 'DistanceMeters']),
      startDate: String(dto['startDate'] ?? dto['StartDate'] ?? ''),
      endDate: String(dto['endDate'] ?? dto['EndDate'] ?? ''),
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      maxVisitors: this.readOptionalNumber(dto, ['maxVisitors', 'MaxVisitors']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      status: String(dto['status'] ?? dto['Status'] ?? ''),
      eventTypeId: Number(dto['eventTypeId'] ?? dto['EventTypeId'] ?? 0),
      eventTypeName: String(dto['eventTypeName'] ?? dto['EventTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      destinationId: this.readOptionalNumber(dto, ['destinationId', 'DestinationId']),
      objectId: this.readOptionalNumber(dto, ['objectId', 'ObjectId']),
      objectName: (dto['objectName'] ?? dto['ObjectName'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as EventDto['images']) || [],
    };
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) {
        continue;
      }

      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private getMainImage(images: ImageDto[], event: EventDto): string {
    if (images.length) {
      const main = images.find((image) => image.isMain);
      return this.resolveMediaUrl(main?.url ?? images[0].url) ?? '';
    }

    return this.resolveMediaUrl(event.mainImageUrl) ?? '';
  }

  getNearbyEventImage(event: EventDto): string | undefined {
    return this.resolveMediaUrl(event.mainImageUrl);
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

  openNearbyEvent(eventId: number): void {
    this.router.navigate(['/event', eventId]);
  }

  toggleFavorite(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const target = this.getFavoriteTarget();
    if (!target || this.isFavoriteBusy) {
      return;
    }

    this.isFavoriteBusy = true;
    this.favoriteStateService.toggle(target, this.favoriteId).subscribe({
      next: (state) => {
        this.isFavorite = state.isFavorite;
        this.favoriteId = state.favoriteId;
      },
      error: () => {
        this.isFavoriteBusy = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isFavoriteBusy = false;
        this.cdr.detectChanges();
      },
    });
  }

  private syncFavoriteState(): void {
    const target = this.getFavoriteTarget();
    if (!target || !this.authService.isLoggedIn()) {
      return;
    }

    this.favoriteStateService.loadFavorites(true).pipe(catchError(() => of(new Map<string, number>()))).subscribe(() => {
      const stateful = { isFavorite: this.isFavorite, favoriteId: this.favoriteId };
      this.favoriteStateService.applyToItem(stateful, target);
      this.isFavorite = stateful.isFavorite;
      this.favoriteId = stateful.favoriteId;
      this.cdr.detectChanges();
    });
  }

  private getFavoriteTarget(): FavoriteTarget | null {
    if (this.event?.objectId) {
      return { type: 'object', entityId: this.event.objectId };
    }

    if (this.event?.destinationId) {
      return { type: 'destination', entityId: this.event.destinationId };
    }

    return null;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(this.translationService.currentLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/events']);
  }

  addToPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/planner/add'], {
      state: {
        eventId: this.event?.id,
        title: this.event?.name || 'Event',
        location:
          [this.event?.localityName, this.event?.destinationName].filter(Boolean).join(', ') ||
          this.event?.objectName ||
          'Montenegro',
        type: this.event?.eventTypeName || 'Dogadjaj',
        imageUrl: this.mainImage || this.resolveMediaUrl(this.event?.mainImageUrl),
        description: this.event?.description,
        startDate: this.event?.startDate,
        endDate: this.event?.endDate,
      },
    });
  }

  buyTicket(): void {
    const price = this.event?.price
      ? `${this.event.price} €`
      : this.translationService.translate('event.free');
    alert(this.translationService.translate('event.ticketAlert', { price }));
  }

  getTicketPrice(): string {
    return this.event?.price
      ? `${this.event.price} €`
      : this.translationService.translate('event.free');
  }

  viewOnMap(): void {
    if (!this.event?.latitude || !this.event?.longitude) return;
    this.router.navigate(['/map'], {
      state: {
        lat: this.event.latitude,
        lng: this.event.longitude,
        zoom: 19,
        selectedItem: this.event,         
      selectedType: 'event'
      }
    });
  }

  openGallery(index = 0): void {
    if (!this.images.length) return;
    this.currentImageIndex = index;
    this.showGalleryModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeGallery(): void {
    this.showGalleryModal = false;
    document.body.style.overflow = 'visible';
  }

  nextImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }

  onSwipe(event: { direction: string }): void {
    if (event.direction === 'left') this.nextImage();
    if (event.direction === 'right') this.prevImage();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const delta = this.touchEndX - this.touchStartX;
    if (Math.abs(delta) < 50) return;

    if (delta < 0) {
      this.nextImage();
    } else {
      this.prevImage();
    }
  }
}
