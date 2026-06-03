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

@Component({
  selector: 'app-content-creator-events',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, PaginatorComponent],
  templateUrl: './events.component.html',
  styleUrls: [
    './events.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/cc-list-page-header.css',
    '../shared/cc-list-detail-layout.css',
    '../shared/cc-page-stats-scroll.css',
    '../shared/cc-stat-cards.css'
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

  stats: EventInsightCard[] = [
    { label: 'Upcoming this week', value: '-', hint: 'Events published in the next 7 days', tone: 'blue' },
    { label: 'Published on page', value: '-', hint: 'Published/approved events in current table page', tone: 'green' },
    { label: 'Capacity configured', value: '-', hint: 'Share of visible events with max visitors set', tone: 'amber' }
  ];

  private readonly fallbackCategoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Festival', label: 'Festival' },
    { value: 'Workshop', label: 'Workshop' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Cultural', label: 'Cultural' },
    { value: 'Exhibition', label: 'Exhibition' },
    { value: 'Concert', label: 'Concert' }
  ];

  private readonly fallbackStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'published', label: 'Published' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  categoryOptions = [...this.fallbackCategoryOptions];
  statusOptions = [...this.fallbackStatusOptions];

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
        this.stats[0] = {
          ...this.stats[0],
          value: String(upcomingVisibleCount)
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats[0] = {
          ...this.stats[0],
          value: String(this.countUpcomingNonDeclinedInEvents(this.events))
        };
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
        this.errorMessage = error?.error?.message ?? 'Failed to load events';
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

  onDateRangeChange(): void {
    if (!this.rangeStartDate || !this.rangeEndDate) {
      return;
    }

    if (this.rangeStartDate > this.rangeEndDate) {
      const originalStart = this.rangeStartDate;
      this.rangeStartDate = this.rangeEndDate;
      this.rangeEndDate = originalStart;
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

  onFilterChange(): void {
    // Filter changes are applied explicitly via the panel's Apply button.
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
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryLabel(event: EventDto): string {
    return event.eventTypeName?.trim() || 'Uncategorized';
  }

  getLocationLabel(event: EventDto): string {
    return event.objectName || event.localityName || event.destinationName || '-';
  }

  getDestinationLabel(event: EventDto): string {
    return event.destinationName || event.localityName || event.objectName || '-';
  }

  getDestinationSubLabel(event: EventDto): string {
    if (event.destinationName) {
      return event.localityName || event.objectName || '—';
    }

    if (event.localityName) {
      return event.objectName || '—';
    }

    return '—';
  }

  getDestinationLocalityLabel(event: EventDto): string {
    if (event.localityName?.trim()) {
      return event.localityName.trim();
    }

    return 'Glavna destinacija';
  }

  getCapacityLabel(event: EventDto): string {
    if (!event.maxVisitors) {
      return '—';
    }

    return `${new Intl.NumberFormat('en-US').format(event.maxVisitors)} max`;
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
      return 'A featured event selected from the creator workspace. Use this panel to inspect the schedule, media, and staffing for the event.';
    }

    return event.description;
  }

  get eventsCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    const count = this.totalCount;
    return `${count} event${count === 1 ? '' : 's'}`;
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
    return this.stats;
  }

  get selectedSchedule(): EventScheduleRow[] {
    if (!this.selectedEvent) {
      return [];
    }

    return [
      { label: 'Starts', value: this.formatDate(this.selectedEvent.startDate) },
      { label: 'Ends', value: this.formatDate(this.selectedEvent.endDate ?? this.selectedEvent.startDate) },
      { label: 'Location', value: this.getLocationLabel(this.selectedEvent) },
      { label: 'Category', value: this.getCategoryLabel(this.selectedEvent) }
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
      return 'Selected event';
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
          ? [{ value: 'all', label: 'All Categories' }, ...dynamicCategories]
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
        label: this.toTitleCase(status)
      }));

    this.statusOptions = dynamicStatuses.length > 0
      ? [{ value: 'all', label: 'All Statuses' }, ...dynamicStatuses]
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

    this.stats[1] = {
      ...this.stats[1],
      value: String(publishedCount)
    };

    this.stats[2] = {
      ...this.stats[2],
      value: `${capacityConfiguredRate}%`
    };
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

}
