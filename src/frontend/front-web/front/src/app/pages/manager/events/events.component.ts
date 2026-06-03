import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
import { EventImageDto, EventService } from '../../../services/event.service';
import { DestinationService } from '../../../services/destination.service';
import { EventDto, EventQueryDto } from '../../../models/event.model';
import { buildEventQueryDto, EventFilterState } from '../../../models/event-filters.model';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';
import { TranslationService } from '../../../services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface EventInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'neutral';
}

interface EventScheduleRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-manager-events',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './events.component.html',
  styleUrls: [
    './events.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-cc-page-parity.css',
    '../shared/manager-list-detail-layout.css',
    '../shared/manager-page-stats-scroll.css',
    '../shared/manager-stat-cards.css',
    '../shared/manager-hero-slides.css'
  ]
})
export class ManagerEventsComponent implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly translationService = inject(TranslationService);

  private static readonly DEFAULT_BANNER_URL = '/assets/pozadina.png';

  Math = Math;

  events: EventDto[] = [];
  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;
  filteredEvents: EventDto[] = [];
  pagedEvents: EventDto[] = [];
  selectedEvent: EventDto | null = null;
  managedDestinationLabel = '';

  isLoading = true;
  errorMessage = '';

  searchQuery = '';
  draftSearchQuery = '';
  statusFilter = 'all';
  categoryFilter = 'all';
  sortBy = 'status';
  sortOrder: 'asc' | 'desc' = 'desc';
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];
  filterPanelOpen = true;

  currentPage = 1;
  totalCount = 0;

  readonly categoryOptions = [
    { value: 'Festival', label: 'manager.events.categories.festival' },
    { value: 'Workshop', label: 'manager.events.categories.workshop' },
    { value: 'Sports', label: 'manager.events.categories.sports' },
    { value: 'Cultural', label: 'manager.events.categories.cultural' },
    { value: 'Exhibition', label: 'manager.events.categories.exhibition' },
    { value: 'Concert', label: 'manager.events.categories.concert' }
  ];

  get stats(): EventInsightCard[] {
    return [
      {
        label: this.translationService.translate('manager.events.stats.upcomingThisWeek'),
        value: '12',
        hint: this.translationService.translate('manager.events.stats.upcomingThisWeekHint'),
        tone: 'blue'
      },
      {
        label: this.translationService.translate('manager.events.stats.activeStaff'),
        value: '48',
        hint: this.translationService.translate('manager.events.stats.activeStaffHint'),
        tone: 'green'
      },
      {
        label: this.translationService.translate('manager.events.stats.totalCapacityFilled'),
        value: '64%',
        hint: this.translationService.translate('manager.events.stats.totalCapacityFilledHint'),
        tone: 'neutral'
      }
    ];
  }

  ngOnInit(): void {
    this.loadManagedDestinationLabel();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
  }

  loadManagedDestinationLabel(): void {
    this.destinationService.getAll({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }).subscribe({
    next: (response: any) => {
      const list = Array.isArray(response) ? response : (response?.items ?? []);
      this.managedDestinationLabel =
        list.map((d: any) => d.name).join(', ') || this.translationService.translate('manager.events.managedDestinationFallback');
    },
    error: () => {
      this.managedDestinationLabel = this.translationService.translate('manager.events.managedDestinationFallback');
    }
  });
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filterState: EventFilterState = {
      searchQuery: this.searchQuery,
      statusFilter: this.statusFilter,
      categoryFilter: this.categoryFilter,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    const query: EventQueryDto = buildEventQueryDto(filterState, {
      page: this.currentPage,
      pageSize: this.pageSize,
      includeStatus: true,
      includeCategoryAsType: true,
      includeDateFilters: false
    });

    this.eventService.getForManager(query).subscribe({
      next: (response) => {
        this.events = response.items;
        this.filteredEvents = response.items;
        this.pagedEvents = response.items;
        this.totalCount = response.totalCount;
        this.currentPage = response.page;

        if (!this.selectedEvent || !this.pagedEvents.some((event) => event.id === this.selectedEvent?.id)) {
          this.selectedEvent = this.pagedEvents[0] ?? null;
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('manager.events.error.load');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(): void {
    // Search is applied on every keyup.
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadEvents();
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onSearchChange();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onApplyFilters(): void {
    this.currentPage = 1;
    this.searchQuery = this.draftSearchQuery.trim();
    this.loadEvents();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.sortBy = 'status';
    this.sortOrder = 'desc';
    this.pageSize = 5;
    this.currentPage = 1;
    this.loadEvents();
  }

  onEditEvent(event: EventDto): void {
    this.router.navigate(['/manager/events/edit', event.id]);
  }

  onViewEvent(event: EventDto): void {
    this.setSelectedEvent(event);
    this.cdr.detectChanges();
  }

  private setSelectedEvent(event: EventDto | null): void {
    const previousId = this.selectedEvent?.id ?? null;
    this.selectedEvent = event;

    if (!event) {
      this.stopHeroImageRotation();
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    if (event.id !== previousId) {
      this.loadHeroImagesForSelectedEvent();
    }
  }

  private loadHeroImagesForSelectedEvent(): void {
    this.stopHeroImageRotation();
    this.heroImageUrls = [];
    this.currentHeroImageIndex = 0;

    if (!this.selectedEvent) {
      return;
    }

    const fallbackUrl = this.getHeroFallbackUrl(this.selectedEvent);

    this.eventService.getImages(this.selectedEvent.id).subscribe({
      next: (images: EventImageDto[]) => {
        const orderedUrls = (images ?? [])
          .slice()
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((image) => this.normalizeImageUrl(image.url))
          .filter((url): url is string => !!url);

        this.heroImageUrls = orderedUrls.length > 0 ? orderedUrls : [fallbackUrl];
        this.currentHeroImageIndex = 0;

        if (orderedUrls.length > 0 && this.selectedEvent && !this.selectedEvent.mainImageUrl) {
          const mainUrl = orderedUrls[0];
          this.selectedEvent = { ...this.selectedEvent, mainImageUrl: mainUrl };
          const idx = this.pagedEvents.findIndex((e) => e.id === this.selectedEvent?.id);
          if (idx >= 0) {
            this.pagedEvents[idx] = { ...this.pagedEvents[idx], mainImageUrl: mainUrl };
          }
        }

        if (this.heroImageUrls.length > 1) {
          this.startHeroImageRotation();
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.heroImageUrls = [fallbackUrl];
        this.currentHeroImageIndex = 0;
        this.cdr.detectChanges();
      }
    });
  }

  private startHeroImageRotation(): void {
    this.stopHeroImageRotation();

    this.heroRotationTimerId = setInterval(() => {
      if (this.heroImageUrls.length <= 1) {
        return;
      }

      this.currentHeroImageIndex =
        (this.currentHeroImageIndex + 1) % this.heroImageUrls.length;
      this.cdr.detectChanges();
    }, HERO_IMAGE_ROTATION_INTERVAL_MS);
  }

  private stopHeroImageRotation(): void {
    if (this.heroRotationTimerId != null) {
      clearInterval(this.heroRotationTimerId);
      this.heroRotationTimerId = null;
    }
  }

  private getHeroFallbackUrl(event: EventDto | null): string {
    const normalized = this.normalizeImageUrl(event?.mainImageUrl);
    return normalized || ManagerEventsComponent.DEFAULT_BANNER_URL;
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
  }

  private normalizeImageUrl(value?: string | null): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return '';
    }

    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
      return trimmed;
    }

    try {
      return encodeURI(new URL(trimmed, document.baseURI).href);
    } catch {
      return encodeURI(trimmed);
    }
  }

  onGoToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadEvents();
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadEvents();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadEvents();
    }
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadEvents();
  }

  trackByEventId(_: number, event: EventDto): number {
    return event.id;
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'published':
        return 'badge-approved';
      case 'pending':
        return 'badge-pending';
      case 'cancelled':
      case 'rejected':
        return 'badge-cancelled';
      case 'draft':
        return 'badge-draft';
      default:
        return 'badge-draft';
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) {
      return '-';
    }

    const d = new Date(date);
    return d.toLocaleDateString(this.translationService.currentLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatTime(date: string | Date | undefined): string {
    if (!date) {
      return '-';
    }

    const d = new Date(date);
    return d.toLocaleTimeString(this.translationService.currentLocale(), {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryLabel(event: EventDto): string {
    return this.translateCategory(this.resolveCategoryValue(event));
  }

  getLocationLabel(event: EventDto): string {
    return event.localityName || event.objectName || event.destinationName || '-';
  }

  getLocationSubLabel(event: EventDto): string {
    if (event.localityName) {
      return event.destinationName || event.objectName || this.managedDestinationLabel || '—';
    }

    if (event.objectName) {
      return event.destinationName || this.managedDestinationLabel || '—';
    }

    const managedLabel = this.managedDestinationLabel?.trim();
    return managedLabel && managedLabel !== event.destinationName ? managedLabel : '—';
  }

  getCapacityLabel(event: EventDto): string {
    if (!event.maxVisitors) {
      return this.translationService.translate('common.notAvailable');
    }

    return this.translationService.translate('manager.events.capacityMax', {
      count: new Intl.NumberFormat(this.translationService.currentLocale()).format(event.maxVisitors)
    });
  }

  getTicketPriceLabel(): string {
    return this.translationService.translate('event.ticketPrice');
  }

  formatTicketPrice(price: number | null | undefined): string {
    return price != null ? `$${price.toFixed(2)}` : this.translationService.translate('common.notAvailable');
  }

  getCapacityProgress(event: EventDto): number {
    const max = event.maxVisitors ?? 2500;
    return Math.min((max / 5000) * 100, 100);
  }

  getCategoryIcon(event: EventDto): string {
    switch (this.resolveCategoryValue(event).toLowerCase()) {
      case 'festival':
        return 'public';
      case 'workshop':
        return 'sell';
      case 'sports':
        return 'event';
      case 'cultural':
        return 'location_on';
      case 'exhibition':
        return 'image';
      case 'concert':
        return 'music_note';
      default:
        return 'category';
    }
  }

  getDetailBanner(event: EventDto | null): string {
    return this.getHeroFallbackUrl(event);
  }

  getSelectedEventRejectionReason(event: EventDto | null): string {
    const reason = event?.rejectionReason?.trim();
    if (!reason || (event?.status ?? '').toLowerCase() !== 'rejected') {
      return '';
    }

    return reason;
  }

  hasSelectedEventRejectionReason(event: EventDto | null): boolean {
    return this.getSelectedEventRejectionReason(event).length > 0;
  }

  getSelectedSummary(event: EventDto | null): string {
    if (!event?.description) {
      return this.translationService.translate('manager.events.noDescription');
    }

    return event.description;
  }

  get selectedSchedule(): EventScheduleRow[] {
    if (!this.selectedEvent) {
      return [];
    }

    return [
      {
        label: this.translationService.translate('manager.events.schedule.starts', {
          date: this.formatDate(this.selectedEvent.startDate)
        }),
        value: this.translationService.translate('manager.events.schedule.localTime', {
          time: this.formatTime(this.selectedEvent.startDate)
        })
      },
      {
        label: this.translationService.translate('manager.events.schedule.ends', {
          date: this.formatDate(this.selectedEvent.endDate ?? this.selectedEvent.startDate)
        }),
        value: this.translationService.translate('manager.events.schedule.localTime', {
          time: this.formatTime(this.selectedEvent.endDate ?? this.selectedEvent.startDate)
        })
      }
    ];
  }

  get hasSelectedEventCoordinates(): boolean {
    return this.selectedEvent?.latitude != null && this.selectedEvent?.longitude != null;
  }

  get selectedEventLat(): number {
    return this.selectedEvent?.latitude ?? 42.424;
  }

  get selectedEventLng(): number {
    return this.selectedEvent?.longitude ?? 18.771;
  }

  get selectedEventLocationLabel(): string {
    if (!this.selectedEvent) {
      return this.translationService.translate('manager.events.selectedEvent');
    }

    const location = this.selectedEvent.objectName || this.selectedEvent.localityName || this.selectedEvent.destinationName;
    return location ? `${this.selectedEvent.name} · ${location}` : this.selectedEvent.name;
  }

  get eventsCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    return this.translationService.translate('manager.events.totalCount', { count: this.totalCount });
  }

  get pageStart(): number {
    if (!this.totalCount || !this.pagedEvents.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.pagedEvents.length - 1;
  }

  get totalPages(): number {
    if (!this.totalCount || this.pageSize < 1) {
      return 1;
    }

    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  private applySearch(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadEvents();
  }

  formatStatus(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'approved':
      case 'published':
        return this.translationService.translate('manager.events.status.approved');
      case 'pending':
        return this.translationService.translate('manager.events.status.pending');
      case 'rejected':
        return this.translationService.translate('manager.events.status.rejected');
      case 'cancelled':
        return this.translationService.translate('manager.events.status.cancelled');
      case 'draft':
      default:
        return this.translationService.translate('manager.events.status.draft');
    }
  }

  private resolveCategoryValue(event: EventDto): string {
    if (event.eventTypeName?.trim()) {
      return event.eventTypeName.trim();
    }

    const categories = ['Festival', 'Workshop', 'Sports', 'Cultural', 'Exhibition', 'Concert'];
    return categories[(event.id - 1) % categories.length] ?? 'Festival';
  }

  private translateCategory(value: string): string {
    switch (value.toLowerCase()) {
      case 'festival':
        return this.translationService.translate('manager.events.categories.festival');
      case 'workshop':
        return this.translationService.translate('manager.events.categories.workshop');
      case 'sports':
        return this.translationService.translate('manager.events.categories.sports');
      case 'cultural':
        return this.translationService.translate('manager.events.categories.cultural');
      case 'exhibition':
        return this.translationService.translate('manager.events.categories.exhibition');
      case 'concert':
        return this.translationService.translate('manager.events.categories.concert');
      default:
        return value;
    }
  }
}
