import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { EventDto, EventQueryDto } from '../../../models/event.model';
import { buildEventQueryDto, EventFilterState } from '../../../models/event-filters.model';

interface EventInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber';
}

interface EventCrewMember {
  name: string;
  role: string;
  initials: string;
}

interface EventScheduleRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-content-creator-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class ContentCreatorEventsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  Math = Math;

  events: EventDto[] = [];
  filteredEvents: EventDto[] = [];
  pagedEvents: EventDto[] = [];
  isLoading = true;
  errorMessage = '';
  selectedEvent: EventDto | null = null;
  
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  readonly pageSizeOptions = [5, 10, 20, 50];

  searchQuery = '';
  draftSearchQuery = '';
  statusFilter = 'all';
  categoryFilter = 'all';
  sortBy = 'startDate';
  sortOrder: 'asc' | 'desc' = 'asc';
  filterPanelOpen = false;
  rangeStartDate = '';
  rangeEndDate = '';

  stats: EventInsightCard[] = [
    { label: 'Upcoming this week', value: '-', hint: 'Events published in the next 7 days', tone: 'blue' },
    { label: 'Active staff', value: '48', hint: 'Content creators and coordinators online', tone: 'green' },
    { label: 'Total capacity filled', value: '64%', hint: 'Average occupancy across published events', tone: 'amber' }
  ];

  readonly crew: EventCrewMember[] = [
    { name: 'Marcus Chen', role: 'Content Creator', initials: 'MC' },
    { name: 'Elena Rodriguez', role: 'Content Creator', initials: 'ER' },
    { name: 'Ana Petrovic', role: 'Event Support', initials: 'AP' }
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
    { value: 'draft', label: 'Draft' },
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

  private loadUpcomingThisWeekStat(): void {
    this.eventService.getMy({
      page: 1,
      pageSize: 1,
      nextDays: 7,
      sortBy: 'startDate',
      sortOrder: 'asc'
    }).subscribe({
      next: (response) => {
        this.stats[0] = {
          ...this.stats[0],
          value: String(response.totalCount ?? 0)
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats[0] = {
          ...this.stats[0],
          value: String(this.countUpcomingInEvents(this.events))
        };
      }
    });
  }

  private countUpcomingInEvents(events: EventDto[]): number {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);

    return events.filter((event) => {
      if (!event.startDate) {
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

        if (!this.selectedEvent || !this.pagedEvents.some((event) => event.id === this.selectedEvent?.id)) {
          this.selectedEvent = this.pagedEvents[0] ?? null;
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
    // Intentionally no-op: search is applied only on Enter or explicit Apply.
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
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
    this.sortBy = 'startDate';
    this.sortOrder = 'asc';
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
    this.selectedEvent = event;
    this.cdr.detectChanges();
  }

  openEventDetails(event: EventDto): void {
    this.router.navigate(['/content-creator/events/view', event.id]);
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
    this.selectedEvent = event;
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
    if (event.eventTypeName) {
      return event.eventTypeName;
    }

    const categories = ['Festival', 'Workshop', 'Sports', 'Cultural', 'Exhibition', 'Concert'];
    return categories[(event.id - 1) % categories.length] ?? 'Festival';
  }

  getLocationLabel(event: EventDto): string {
    const locations = [
      'Grand Highland Park',
      'Clay & Co. Studio',
      'Azure Bay Waterfront',
      'The Blue Note Lounge',
      'Central Exhibition Hall',
      'Riverside Open Arena'
    ];

    return locations[(event.id - 1) % locations.length] ?? 'Central Venue';
  }

  getCapacityLabel(event: EventDto): string {
    if (!event.maxVisitors) {
      return '—';
    }

    return `${new Intl.NumberFormat('en-US').format(event.maxVisitors)} max`;
  }

  getDetailBanner(event: EventDto | null): string {
    if (event?.mainImageUrl) {
      return this.normalizeImageUrl(event.mainImageUrl);
    }

    return '/assets/pozadina.png';
  }

  getSelectedSummary(event: EventDto | null): string {
    if (!event?.description) {
      return 'A featured event selected from the creator workspace. Use this panel to inspect the schedule, media, and staffing for the event.';
    }

    return event.description;
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

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

}