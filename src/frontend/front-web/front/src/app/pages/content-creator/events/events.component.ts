import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
import { forkJoin } from 'rxjs';
import { EventImageDto, EventService } from '../../../services/event.service';
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
  tone: 'blue' | 'green' | 'amber';
}

interface EventScheduleRow {
  label: string;
  value: string;
}

interface EventFilterOption {
  value: string;
  label?: string;
  labelKey?: string;
}

@Component({
  selector: 'app-content-creator-events',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './events.component.html',
  styleUrls: [
    './events.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/cc-list-page-header.css',
    '../shared/cc-list-detail-layout.css',
    '../shared/cc-page-stats-scroll.css',
    '../shared/cc-stat-cards.css',
    '../shared/cc-filters-parity.css'
  ]
})
export class ContentCreatorEventsComponent implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);

  private static readonly DEFAULT_BANNER_URL = '/assets/pozadina.png';

  Math = Math;

  events: EventDto[] = [];
  filteredEvents: EventDto[] = [];
  pagedEvents: EventDto[] = [];
  isLoading = true;
  errorMessage = '';
  selectedEvent: EventDto | null = null;

  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  readonly pageSizeOptions = [5, 10, 20, 50];

  searchQuery = '';
  draftSearchQuery = '';
  statusFilter = 'all';
  categoryFilter = 'all';
  sortBy = 'status';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterPanelOpen = true;
  rangeStartDate = '';
  rangeEndDate = '';

  upcomingThisWeekCount = '-';
  publishedOnPageCount = '-';
  capacityConfiguredRate = '-';

  private readonly fallbackCategoryOptions: EventFilterOption[] = [
    { value: 'all', labelKey: 'contentCreator.events.filters.allCategories' },
    { value: 'Festival', labelKey: 'contentCreator.events.categories.festival' },
    { value: 'Workshop', labelKey: 'contentCreator.events.categories.workshop' },
    { value: 'Sports', labelKey: 'contentCreator.events.categories.sports' },
    { value: 'Cultural', labelKey: 'contentCreator.events.categories.cultural' },
    { value: 'Exhibition', labelKey: 'contentCreator.events.categories.exhibition' },
    { value: 'Concert', labelKey: 'contentCreator.events.categories.concert' }
  ];

  private readonly fallbackStatusOptions: EventFilterOption[] = [
    { value: 'all', labelKey: 'contentCreator.events.filters.allStatuses' },
    { value: 'published', labelKey: 'contentCreator.events.status.published' },
    { value: 'draft', labelKey: 'contentCreator.events.status.draft' },
    { value: 'pending', labelKey: 'contentCreator.events.status.pending' },
    { value: 'approved', labelKey: 'contentCreator.events.status.approved' },
    { value: 'cancelled', labelKey: 'contentCreator.events.status.cancelled' }
  ];

  categoryOptions = [...this.fallbackCategoryOptions];
  statusOptions = [...this.fallbackStatusOptions];

  translateOptionLabel(option: EventFilterOption): string {
    if (option.labelKey) {
      return this.translationService.translate(option.labelKey);
    }

    return option.label ?? '';
  }

  ngOnInit(): void {
    this.loadCategoryOptions();
    this.loadEvents();
    this.loadUpcomingThisWeekStat();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
  }

  private loadUpcomingThisWeekStat(): void {
    forkJoin({
      approved: this.eventService.getMy({
        page: 1,
        pageSize: 1,
        nextDays: 7,
        status: 'approved',
        sortBy: 'startDate',
        sortOrder: 'asc'
      }),
      published: this.eventService.getMy({
        page: 1,
        pageSize: 1,
        nextDays: 7,
        status: 'published',
        sortBy: 'startDate',
        sortOrder: 'asc'
      })
    }).subscribe({
      next: ({ approved, published }) => {
        const upcomingVisibleCount = (approved.totalCount ?? 0) + (published.totalCount ?? 0);
        this.upcomingThisWeekCount = String(upcomingVisibleCount);
        this.cdr.detectChanges();
      },
      error: () => {
        this.upcomingThisWeekCount = String(this.countUpcomingNonDeclinedInEvents(this.events));
      }
    });
  }

  private countUpcomingNonDeclinedInEvents(events: EventDto[]): number {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);

    return events.filter((event) => {
      if (!event.startDate) {
        return false;
      }

      const normalizedStatus = (event.status ?? '').toLowerCase();
      if (normalizedStatus === 'declined' || normalizedStatus === 'rejected') {
        return false;
      }

      const start = new Date(event.startDate);
      return start >= now && start <= weekAhead;
    }).length;
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filterState: EventFilterState = {
      searchQuery: this.searchQuery,
      statusFilter: this.statusFilter,
      categoryFilter: this.categoryFilter,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      startDate: this.rangeStartDate || null,
      endDate: this.rangeEndDate || null
    };

    const query: EventQueryDto = buildEventQueryDto(filterState, {
      page: this.currentPage,
      pageSize: this.pageSize,
      includeStatus: true,
      includeCategoryAsType: true,
      includeDateFilters: true
    });

    this.eventService.getMy(query).subscribe({
      next: (response) => {
        this.events = response.items;
        this.filteredEvents = response.items;
        this.pagedEvents = response.items;
        this.totalCount = response.totalCount;
        this.currentPage = response.page;
        this.syncStatusOptionsFromEvents();
        this.refreshPageInsightCards(response.items ?? []);

        if (!this.selectedEvent || !this.pagedEvents.some((event) => event.id === this.selectedEvent?.id)) {
          this.setSelectedEvent(this.pagedEvents[0] ?? null);
        } else if (this.selectedEvent) {
          this.loadHeroImagesForSelectedEvent();
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('contentCreator.events.error.load');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    // Search is applied on every keyup.
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadEvents();
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onSearch();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onApplyFilters(): void {
    this.applySearchAndReload();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.sortBy = 'status';
    this.sortOrder = 'desc';
    this.rangeStartDate = '';
    this.rangeEndDate = '';
    this.currentPage = 1;
    this.loadEvents();
  }

  onClearSearch(): void {
    this.onResetFilters();
  }

  onStartDateChange(): void {
    if (this.rangeStartDate && this.rangeEndDate && this.rangeStartDate > this.rangeEndDate) {
      this.rangeEndDate = '';
    }

    this.applyDateRangeFilter();
  }

  onEndDateChange(): void {
    if (this.rangeStartDate && this.rangeEndDate && this.rangeEndDate < this.rangeStartDate) {
      this.rangeEndDate = '';
      return;
    }

    this.applyDateRangeFilter();
  }

  private applyDateRangeFilter(): void {
    if (!this.rangeStartDate || !this.rangeEndDate) {
      return;
    }

    this.currentPage = 1;
    this.loadEvents();
  }

  onChangeSortBy(value: string): void {
    this.sortBy = value;
    this.currentPage = 1;
    this.loadEvents();
  }

  onChangeSortOrder(value: 'asc' | 'desc'): void {
    this.sortOrder = value;
    this.currentPage = 1;
    this.loadEvents();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadEvents();
  }
  onCreateEvent(): void {
    this.router.navigate(['/content-creator/events/create']);
  }

  onEditEvent(event: EventDto): void {
    this.router.navigate(['/content-creator/events/edit', event.id]);
  }

  onViewEvent(event: EventDto): void {
    this.setSelectedEvent(event);
  }

  openEventDetails(event: EventDto): void {
    this.router.navigate(['/content-creator/events/view', event.id]);
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

  selectEvent(event: EventDto): void {
    this.setSelectedEvent(event);
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
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
      case 'rejected':
      case 'cancelled':
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }

  humanizeStatus(status?: string | null): string {
    const normalized = status?.trim().toLowerCase();
    if (!normalized) {
      return this.translationService.translate('contentCreator.events.status.draft');
    }

    const translated = this.translationService.translate(`contentCreator.events.status.${normalized}`);
    return translated === `contentCreator.events.status.${normalized}`
      ? status!
      : translated;
  }

  getRejectionReason(event: EventDto | null): string {
    const reason = event?.rejectionReason?.trim();
    if (!reason || (event?.status ?? '').toLowerCase() !== 'rejected') {
      return '';
    }

    return reason;
  }

  hasRejectionReason(event: EventDto | null): boolean {
    return this.getRejectionReason(event).length > 0;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString(this.translationService.currentLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryLabel(event: EventDto): string {
    return event.eventTypeName?.trim() || this.translationService.translate('contentCreator.events.uncategorized');
  }

  getLocationLabel(event: EventDto): string {
    return event.objectName || event.localityName || event.destinationName || this.translationService.translate('common.notAvailable');
  }

  getDestinationLabel(event: EventDto): string {
    return event.destinationName || event.localityName || event.objectName || this.translationService.translate('common.notAvailable');
  }

  getDestinationSubLabel(event: EventDto): string {
    if (event.destinationName) {
      return event.localityName || event.objectName || this.translationService.translate('common.notAvailable');
    }

    if (event.localityName) {
      return event.objectName || this.translationService.translate('common.notAvailable');
    }

    return this.translationService.translate('common.notAvailable');
  }

  getDestinationLocalityLabel(event: EventDto): string {
    if (event.localityName?.trim()) {
      return event.localityName.trim();
    }

      return this.translationService.translate('contentCreator.events.primaryDestination');
  }

  getCapacityLabel(event: EventDto): string {
    if (!event.maxVisitors) {
      return this.translationService.translate('common.notAvailable');
    }

    return this.translationService.translate('contentCreator.events.capacityMax', {
      count: new Intl.NumberFormat(this.translationService.currentLocale()).format(event.maxVisitors),
    });
  }

  getTicketPriceLabel(): string {
    return this.translationService.translate('event.ticketPrice');
  }

  formatTicketPrice(price: number | null | undefined): string {
    return price != null
      ? `$${price.toFixed(2)}`
      : this.translationService.translate('event.free');
  }

  getDetailBanner(event: EventDto | null): string {
    if (event?.mainImageUrl) {
      return this.normalizeImageUrl(event.mainImageUrl);
    }

    return ContentCreatorEventsComponent.DEFAULT_BANNER_URL;
  }

  getEventMediaStyle(event: EventDto): Record<string, string> {
    const url = this.getDetailBanner(event);
    return url ? { 'background-image': `url("${url}")` } : {};
  }

  get heroMediaFallbackStyle(): Record<string, string> {
    const url = this.getDetailBanner(this.selectedEvent);
    return url ? { 'background-image': `url("${url}")` } : {};
  }

  getSelectedSummary(event: EventDto | null): string {
    if (!event?.description) {
      return this.translationService.translate('contentCreator.events.noDescription');
    }

    return event.description;
  }

  get eventsCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    return this.translationService.translate('contentCreator.events.totalCount', { count: this.totalCount });
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

  get selectedInsightCards(): EventInsightCard[] {
    return [
      {
        label: this.translationService.translate('contentCreator.events.stats.upcomingThisWeek'),
        value: this.upcomingThisWeekCount,
        hint: this.translationService.translate('contentCreator.events.stats.next7DaysHint'),
        tone: 'blue',
      },
      {
        label: this.translationService.translate('contentCreator.events.stats.publishedOnPage'),
        value: this.publishedOnPageCount,
        hint: this.translationService.translate('contentCreator.events.stats.pageVisibilityHint'),
        tone: 'green',
      },
      {
        label: this.translationService.translate('contentCreator.events.stats.capacityConfigured'),
        value: this.capacityConfiguredRate,
        hint: this.translationService.translate('contentCreator.events.stats.capacityConfiguredHint'),
        tone: 'amber',
      },
    ];
  }

  get selectedSchedule(): EventScheduleRow[] {
    if (!this.selectedEvent) {
      return [];
    }

    return [
      { label: this.translationService.translate('contentCreator.events.schedule.starts'), value: this.formatDate(this.selectedEvent.startDate) },
      { label: this.translationService.translate('contentCreator.events.schedule.ends'), value: this.formatDate(this.selectedEvent.endDate ?? this.selectedEvent.startDate) },
      { label: this.translationService.translate('contentCreator.events.schedule.location'), value: this.getLocationLabel(this.selectedEvent) },
      { label: this.translationService.translate('contentCreator.events.schedule.category'), value: this.getCategoryLabel(this.selectedEvent) }
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
      return this.translationService.translate('contentCreator.events.selectedEvent');
    }

    const location = this.selectedEvent.localityName || this.selectedEvent.destinationName || this.selectedEvent.objectName;
    return location ? `${this.selectedEvent.name} · ${location}` : this.selectedEvent.name;
  }

  private setSelectedEvent(event: EventDto | null): void {
    this.selectedEvent = event;

    if (!event) {
      this.stopHeroImageRotation();
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    this.loadHeroImagesForSelectedEvent();
  }

  private loadHeroImagesForSelectedEvent(): void {
    this.stopHeroImageRotation();

    if (!this.selectedEvent) {
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    const fallbackUrl = this.getDetailBanner(this.selectedEvent);
    this.heroImageUrls = [fallbackUrl];
    this.currentHeroImageIndex = 0;
    this.cdr.detectChanges();

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

  private normalizeImageUrl(value: string): string {
    const trimmed = value.trim();

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

  private applySearchAndReload(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadEvents();
  }

  private loadCategoryOptions(): void {
    this.eventService.getEventTypes().subscribe({
      next: (types) => {
        const dynamicCategories = (types ?? [])
          .map((type) => type.name?.trim())
          .filter((name): name is string => !!name)
          .filter((name, index, all) => all.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === index)
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({ value: name, label: name }));

        this.categoryOptions = dynamicCategories.length > 0
          ? [{ value: 'all', labelKey: 'contentCreator.events.filters.allCategories' }, ...dynamicCategories]
          : [...this.fallbackCategoryOptions];

        if (!this.categoryOptions.some((option) => option.value === this.categoryFilter)) {
          this.categoryFilter = 'all';
        }
      },
      error: () => {
        this.categoryOptions = [...this.fallbackCategoryOptions];
      }
    });
  }

  private syncStatusOptionsFromEvents(): void {
    const dynamicStatuses = this.events
      .map((event) => event.status?.trim())
      .filter((status): status is string => !!status)
      .filter((status, index, all) => all.findIndex((x) => x.toLowerCase() === status.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b))
      .map((status) => ({
        value: status.toLowerCase(),
        label: this.humanizeStatus(status)
      }));

    this.statusOptions = dynamicStatuses.length > 0
      ? [{ value: 'all', labelKey: 'contentCreator.events.filters.allStatuses' }, ...dynamicStatuses]
      : [...this.fallbackStatusOptions];

    if (!this.statusOptions.some((option) => option.value === this.statusFilter)) {
      this.statusFilter = 'all';
    }
  }

  private refreshPageInsightCards(items: EventDto[]): void {
    const publishedCount = items.filter((event) => {
      const normalized = (event.status ?? '').toLowerCase();
      return normalized === 'published' || normalized === 'approved';
    }).length;

    const configuredCapacityCount = items.filter((event) => (event.maxVisitors ?? 0) > 0).length;
    const capacityConfiguredRate = items.length > 0
      ? Math.round((configuredCapacityCount / items.length) * 100)
      : 0;

    this.publishedOnPageCount = String(publishedCount);
    this.capacityConfiguredRate = `${capacityConfiguredRate}%`;
  }

}
