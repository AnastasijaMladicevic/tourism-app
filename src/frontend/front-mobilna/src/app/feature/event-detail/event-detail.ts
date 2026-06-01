import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
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
import { MapComponent } from '../../shared/components/map/map';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { environment } from '../../../environment/environment';
import { EventPlannerService } from '../../services/event-planner';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { PendingActionService } from '../../services/pending-action';
import { RouterHistoryService } from '../../services/router-history';
import { QrLinkDto, QrLinkService } from '../../services/qr-link';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent, TranslatePipe],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventDetailComponent implements OnInit, OnDestroy {
  event: EventDto | null = null;
  images: ImageDto[] = [];
  nearbyEvents: EventDto[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  qrLink: QrLinkDto | null = null;
  isInPlanner = false;
  plannerId?: number;
  isPlannerBusy = false;

  showGalleryModal = false;
  currentImageIndex = 0;

  titleVisible = true;
  private titleObserver?: IntersectionObserver;
  private observerSetup = false;
  private touchStartX = 0;
  private touchEndX = 0;

  get ticketTypesForDisplay(): Array<{ name: string; price?: number }> {
    if (!this.event) {
      return [];
    }

    if (Array.isArray(this.event.ticketTypes) && this.event.ticketTypes.length > 0) {
      return [...this.event.ticketTypes]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((ticketType) => ({
          name: ticketType.name,
          price: ticketType.price,
        }));
    }

    return [
      {
        name: this.translationService.translate('event.standardTicket'),
        price: this.event.price,
      },
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private imageService: ImageService,
    private authService: AuthService,
    private eventPlannerService: EventPlannerService,
    private plannerLocalPreferences: PlannerLocalPreferencesService,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
    private pendingActionService: PendingActionService,
    private routerHistory: RouterHistoryService,
    private qrLinkService: QrLinkService,
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) return;

      this.loadEvent(id);
    });
    window.addEventListener('focus', this.handleWindowFocus);
    window.addEventListener('add-to-planner', (event: any) => {
      const obj = event.detail;
      if (obj) {
        this.addToPlanner();
      }
    });
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    window.removeEventListener('focus', this.handleWindowFocus);
    this.titleObserver?.disconnect();
  }

  private setupTitleObserver(): void {
    if (this.observerSetup) return;
    setTimeout(() => {
      const titleEl = this.el.nativeElement.querySelector('.title');
      if (!titleEl) return;
      this.observerSetup = true;
      this.titleObserver = new IntersectionObserver(
        ([entry]) => {
          this.titleVisible = entry.isIntersecting;
          this.cdr.detectChanges();
        },
        { rootMargin: '-55px 0px 0px 0px', threshold: 0 }
      );
      this.titleObserver.observe(titleEl);
    }, 100);
  }

  private loadEvent(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      event: this.eventService.getById(id),
      images: this.imageService.getForEvent(id),
      qr: this.qrLinkService
        .getForEntity('events', id)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ event, images, qr }) => {
        const normalizedEvent = this.normalizeEvent(event);

        this.event = normalizedEvent;
        this.qrLink = qr;
        this.images = images || [];
        this.mainImage = this.getMainImage(this.images, normalizedEvent);

        this.syncPlannerState();
        this.loadNearbyEvents(normalizedEvent);

        this.isLoading = false;
        this.cdr.detectChanges();
        this.setupTitleObserver();
      },
      error: (err) => {
        console.error('Failed to load event details:', err);

        this.isLoading = false;
        this.errorMessage =
          this.translationService.translate('event.loadingError');

        this.cdr.detectChanges();
      },
    });
  }
  removeFromPlanner(): void {
    if (!this.plannerId) return;

    const plannerId = this.plannerId;
    this.isPlannerBusy = true;

    this.eventPlannerService.remove(plannerId).subscribe({
      next: () => {
        this.plannerLocalPreferences.remove(plannerId);
        this.isInPlanner = false;
        this.plannerId = undefined;
        this.isPlannerBusy = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Greška pri uklanjanju iz plana', err);
        this.isPlannerBusy = false;
        this.cdr.detectChanges();
      }
    });
  }

  private syncPlannerState(): void {
    if (!this.authService.isLoggedIn() || !this.event?.id) {
      this.isInPlanner = false;
      this.plannerId = undefined;
      this.cdr.detectChanges();
      return;
    }

    this.eventPlannerService
      .getMyPlanner({
        page: 1,
        pageSize: 100,
        sortBy: 'startDate',
        sortOrder: 'asc',
      })
      .pipe(
        catchError((err) => {
          console.error('Failed to sync planner state:', err);
          return of({ items: [] });
        }),
      )
      .subscribe((result) => {
        const plannerItem =
          result.items?.find((item) => Number(item.eventId) === Number(this.event?.id)) ?? null;

        this.isInPlanner = !!plannerItem;
        this.plannerId = plannerItem?.id;
        this.cdr.detectChanges();
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
      ticketTypes: this.readTicketTypes(dto),
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

  private readTicketTypes(obj: Record<string, unknown>): EventDto['ticketTypes'] {
    const raw = obj['ticketTypes'] ?? obj['TicketTypes'];
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((ticketType) => {
        const ticketRecord = ticketType as Record<string, unknown>;
        const id = Number(ticketRecord['id'] ?? ticketRecord['Id'] ?? 0);
        const name = String(ticketRecord['name'] ?? ticketRecord['Name'] ?? '').trim();
        const price = this.readOptionalNumber(ticketRecord, ['price', 'Price']);
        const sortOrder = Number(ticketRecord['sortOrder'] ?? ticketRecord['SortOrder'] ?? 0);

        if (!name) {
          return null;
        }

        return {
          id,
          name,
          price: price ?? 0,
          sortOrder,
        };
      })
      .filter((ticketType): ticketType is NonNullable<EventDto['ticketTypes']>[number] => ticketType != null);
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

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  formatTime(startDateStr: string, endDateStr?: string): string {
    if (!startDateStr) return '';

    const start = new Date(startDateStr);

    const format = (d: Date) =>
      d.toLocaleTimeString(this.translationService.currentLocale(), {
        hour: '2-digit',
        minute: '2-digit'
      });

    if (!endDateStr) {
      return format(start);
    }

    const end = new Date(endDateStr);

    return `${format(start)} - ${format(end)}`;
  }
  formatDate(dateStr: string, endDateStr?: string): string {
    const start = new Date(dateStr);

    const baseFormat = (d: Date) =>
      d.toLocaleDateString(this.translationService.currentLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    if (!endDateStr) {
      return baseFormat(start);
    }

    const end = new Date(endDateStr);

    const sameDay =
      start.getDate() === end.getDate() &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear();

    if (sameDay) {
      return baseFormat(start);
    }

    return `${baseFormat(start)} - ${baseFormat(end)}`;
  }

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  
    if (returnUrl?.startsWith('/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
  
    this.routerHistory.goBack('/events');
  }

  addToPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'add-to-planner',
        payload: this.event
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.isPlannerBusy) {
      return;
    }

    if (this.isInPlanner && this.plannerId) {
      this.removeFromPlanner();
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
    const price = this.ticketTypesForDisplay
      .map((ticketType) => `${ticketType.name}: ${this.formatTicketPrice(ticketType.price)}`)
      .join(', ');
    alert(this.translationService.translate('event.ticketAlert', { price }));
  }

  formatTicketPrice(price?: number): string {
    return price != null
      ? `${price} €`
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

  private readonly handleWindowFocus = (): void => {
    this.syncPlannerState();
  };
}
